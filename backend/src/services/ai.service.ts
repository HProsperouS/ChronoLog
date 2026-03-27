import { readInsights, writeInsights } from '../store/config.store';
import { readRange } from '../store/activity.store';
import * as StatsService from './stats.service';
import type { Insight, SessionTimelineEntry } from '../types';

/** Local calendar step for YYYY-MM-DD (matches frontend `addDaysYmd`; avoids UTC `toISOString` day shifts). */
function addDaysYmd(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Cap rows sent to Lambda (privacy + payload size). */
const MAX_SESSION_TIMELINE = 240;
const DAILY_INSIGHTS_GENERATE_LIMIT = 3;
const GENERATE_COOLDOWN_MS = 2 * 60 * 60 * 1_000; // 2 hours

const WEEKLY_INSIGHTS_GENERATE_LIMIT = 2;
const WEEKLY_GENERATE_COOLDOWN_MS = 6 * 60 * 60 * 1_000; // 6 hours

export class InsightQuotaError extends Error {
  constructor(
    public readonly limit: number,
    public readonly used: number,
    public readonly date: string,
  ) {
    super(`Daily insights generation limit reached (${used}/${limit}) for ${date}`);
    this.name = 'InsightQuotaError';
  }
}

export class InsightCooldownError extends Error {
  constructor(
    public readonly nextAvailableAt: string,
    public readonly cooldownRemainingMinutes: number,
  ) {
    super(`Please wait ${cooldownRemainingMinutes} more minute(s) before generating again.`);
    this.name = 'InsightCooldownError';
  }
}

export class WeeklyInsightQuotaError extends Error {
  constructor(
    public readonly limit: number,
    public readonly used: number,
    public readonly weekStart: string,
  ) {
    super(`Weekly insights generation limit reached (${used}/${limit}) for week starting ${weekStart}`);
    this.name = 'WeeklyInsightQuotaError';
  }
}

export class WeeklyInsightCooldownError extends Error {
  constructor(
    public readonly nextAvailableAt: string,
    public readonly cooldownRemainingMinutes: number,
  ) {
    super(`Please wait ${cooldownRemainingMinutes} more minute(s) before generating again.`);
    this.name = 'WeeklyInsightCooldownError';
  }
}

function getInsightsUrl(): string {
  const url = process.env.INSIGHTS_FUNCTION_URL?.trim();
  if (!url) throw new Error('INSIGHTS_FUNCTION_URL is not set (Lambda Function URL)');
  return url.replace(/\/$/, '');
}

function getProxySecret(): string {
  const secret = process.env.INSIGHTS_PROXY_SECRET?.trim();
  if (!secret) throw new Error('INSIGHTS_PROXY_SECRET is not set (same value as CDK ProxySecret)');
  return secret;
}

function buildSessionTimeline(date: string): SessionTimelineEntry[] {
  const acts = readRange(date, date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return acts.slice(0, MAX_SESSION_TIMELINE).map((a) => {
    const d = new Date(a.startTime);
    const startLocal = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return {
      startTime: a.startTime,
      startLocal,
      durationMinutes: a.duration,
      appName: a.appName,
      category: a.category,
    };
  });
}

function isInsightShape(x: unknown): x is Omit<Insight, 'id' | 'date' | 'created_at'> {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const t = o.type;
  if (t !== 'pattern' && t !== 'achievement' && t !== 'recommendation') return false;
  return typeof o.title === 'string' && typeof o.description === 'string' && typeof o.icon === 'string';
}

/**
 * Calls the hosted Lambda (Function URL), merges results into insights.json.
 * Uses extended payload (not the public `/api/stats` shape). OpenAI runs only in AWS.
 */
export async function generateInsights(date: string): Promise<Insight[]> {
  const quota = getInsightsGenerateQuota(date);
  if (!quota.canGenerate && quota.cooldownRemainingMinutes > 0 && quota.nextAvailableAt) {
    throw new InsightCooldownError(quota.nextAvailableAt, quota.cooldownRemainingMinutes);
  }
  if (quota.remaining <= 0) {
    throw new InsightQuotaError(quota.limit, quota.used, date);
  }

  const url = getInsightsUrl();
  const secret = getProxySecret();
  const stats = StatsService.getInsightsLambdaStats(date);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      date,
      stats,
      sessionTimeline: buildSessionTimeline(date),
    }),
  });

  const rawText = await res.text();
  let body: unknown;
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Insights proxy returned non-JSON (${res.status})`);
  }

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : rawText.slice(0, 200);
    throw new Error(`Insights proxy ${res.status}: ${msg}`);
  }

  if (!body || typeof body !== 'object' || !('insights' in body)) {
    throw new Error('Insights proxy response missing "insights" array');
  }

  const items = (body as { insights: unknown }).insights;
  if (!Array.isArray(items)) throw new Error('Insights proxy "insights" is not an array');

  const now = new Date().toISOString();
  const newInsights: Insight[] = [];
  let i = 0;
  for (const item of items) {
    if (!isInsightShape(item)) continue;
    newInsights.push({
      id: `${date}-${i}`,
      type: item.type,
      title: item.title,
      description: item.description,
      icon: item.icon,
      date,
      created_at: now,
    });
    i++;
  }

  if (newInsights.length === 0) {
    throw new Error('Insights proxy returned no valid insight items');
  }

  const existing = readInsights().filter((ins) => ins.date !== date);
  writeInsights([...existing, ...newInsights]);

  return newInsights;
}

export function getInsights(date?: string): Insight[] {
  const all = readInsights();
  if (!date) return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return all
    .filter((ins) => ins.date === date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Get weekly insights for a specific week (Monday start). */
export function getWeeklyInsights(weekStart?: string): Insight[] {
  const all = readInsights();
  if (!weekStart) return all.filter((ins) => ins.weekStart).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return all
    .filter((ins) => ins.weekStart === weekStart)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Get the Monday of the current week in YYYY-MM-DD format. */
export function getLastMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(today.setDate(diff));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getInsightsGenerateQuota(date: string): {
  date: string;
  used: number;
  remaining: number;
  limit: number;
  canGenerate: boolean;
  cooldownRemainingMinutes: number;
  nextAvailableAt: string | null;
} {
  const all = readInsights();
  const used = new Set(all.filter((ins) => ins.date === date).map((ins) => ins.created_at)).size;
  const remaining = Math.max(0, DAILY_INSIGHTS_GENERATE_LIMIT - used);
  const latestCreatedAt = all
    .map((ins) => ins.created_at)
    .sort((a, b) => b.localeCompare(a))[0];

  let cooldownRemainingMinutes = 0;
  let nextAvailableAt: string | null = null;
  if (latestCreatedAt) {
    const nextMs = new Date(latestCreatedAt).getTime() + GENERATE_COOLDOWN_MS;
    const diff = nextMs - Date.now();
    if (Number.isFinite(diff) && diff > 0) {
      cooldownRemainingMinutes = Math.ceil(diff / 60_000);
      nextAvailableAt = new Date(nextMs).toISOString();
    }
  }

  const canGenerate = remaining > 0 && cooldownRemainingMinutes <= 0;
  return {
    date,
    used,
    remaining,
    limit: DAILY_INSIGHTS_GENERATE_LIMIT,
    canGenerate,
    cooldownRemainingMinutes,
    nextAvailableAt,
  };
}

/** Generate weekly insights (Monday–Sunday). */
export async function generateWeeklyInsights(weekStartMonday: string): Promise<Insight[]> {
  const quota = getWeeklyInsightsGenerateQuota(weekStartMonday);
  if (!quota.canGenerate && quota.cooldownRemainingMinutes > 0 && quota.nextAvailableAt) {
    throw new WeeklyInsightCooldownError(quota.nextAvailableAt, quota.cooldownRemainingMinutes);
  }
  if (quota.remaining <= 0) {
    throw new WeeklyInsightQuotaError(quota.limit, quota.used, weekStartMonday);
  }

  // Add 6 days to Monday to get Sunday
  const weekEndSunday = addDaysYmd(weekStartMonday, 6);

  const url = getInsightsUrl();
  const secret = getProxySecret();
  const weeklyStatsPayload = StatsService.getInsightsLambdaStatsWeekly(weekStartMonday, weekEndSunday);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      mode: 'weekly',
      weekStart: weekStartMonday,
      weekEnd: weekEndSunday,
      ...weeklyStatsPayload,
    }),
  });

  const rawText = await res.text();
  let body: unknown;
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Insights proxy returned non-JSON (${res.status})`);
  }

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : rawText.slice(0, 200);
    throw new Error(`Insights proxy ${res.status}: ${msg}`);
  }

  if (!body || typeof body !== 'object' || !('insights' in body)) {
    throw new Error('Insights proxy response missing "insights" array');
  }

  const items = (body as { insights: unknown }).insights;
  if (!Array.isArray(items)) throw new Error('Insights proxy "insights" is not an array');

  const now = new Date().toISOString();
  const newInsights: Insight[] = [];
  let i = 0;
  for (const item of items) {
    if (!isInsightShape(item)) continue;
    newInsights.push({
      id: `${weekStartMonday}-weekly-${i}`,
      type: item.type,
      title: item.title,
      description: item.description,
      icon: item.icon,
      weekStart: weekStartMonday,
      created_at: now,
    });
    i++;
  }

  if (newInsights.length === 0) {
    throw new Error('Insights proxy returned no valid insight items');
  }

  const existing = readInsights().filter((ins) => ins.weekStart !== weekStartMonday);
  writeInsights([...existing, ...newInsights]);

  return newInsights;
}

export function getWeeklyInsightsGenerateQuota(weekStartMonday: string): {
  weekStart: string;
  used: number;
  remaining: number;
  limit: number;
  canGenerate: boolean;
  cooldownRemainingMinutes: number;
  nextAvailableAt: string | null;
} {
  const all = readInsights();
  const used = new Set(
    all.filter((ins) => ins.weekStart === weekStartMonday).map((ins) => ins.created_at),
  ).size;
  const remaining = Math.max(0, WEEKLY_INSIGHTS_GENERATE_LIMIT - used);

  const weeklyInsights = all.filter((ins) => ins.weekStart === weekStartMonday);
  const latestCreatedAt = weeklyInsights
    .map((ins) => ins.created_at)
    .sort((a, b) => b.localeCompare(a))[0];

  let cooldownRemainingMinutes = 0;
  let nextAvailableAt: string | null = null;
  if (latestCreatedAt) {
    const nextMs = new Date(latestCreatedAt).getTime() + WEEKLY_GENERATE_COOLDOWN_MS;
    const diff = nextMs - Date.now();
    if (Number.isFinite(diff) && diff > 0) {
      cooldownRemainingMinutes = Math.ceil(diff / 60_000);
      nextAvailableAt = new Date(nextMs).toISOString();
    }
  }

  const canGenerate = remaining > 0 && cooldownRemainingMinutes <= 0;
  return {
    weekStart: weekStartMonday,
    used,
    remaining,
    limit: WEEKLY_INSIGHTS_GENERATE_LIMIT,
    canGenerate,
    cooldownRemainingMinutes,
    nextAvailableAt,
  };
}
