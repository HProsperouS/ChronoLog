import { readInsights, writeInsights } from '../store/config.store';
import { readRange } from '../store/activity.store';
import * as StatsService from './stats.service';
import type { Insight, SessionTimelineEntry, DailyStats, InsightsLambdaStatsPayload } from '../types';

/** Cap rows sent to Lambda (privacy + payload size). */
const MAX_SESSION_TIMELINE = 240;
const DAILY_INSIGHTS_GENERATE_LIMIT = 3;
const WEEKLY_INSIGHTS_GENERATE_LIMIT = 2;
const GENERATE_COOLDOWN_MS = 2 * 60 * 60 * 1_000; // 2 hours
const WEEKLY_GENERATE_COOLDOWN_MS = 24 * 60 * 60 * 1_000; // 24 hours

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

export async function generateWeeklyInsights(startDate: string): Promise<Insight[]> {
  const quota = getWeeklyInsightsGenerateQuota(startDate);
  if (!quota.canGenerate && quota.cooldownRemainingMinutes > 0 && quota.nextAvailableAt) {
    throw new InsightCooldownError(quota.nextAvailableAt, quota.cooldownRemainingMinutes);
  }
  if (quota.remaining <= 0) {
    throw new InsightQuotaError(quota.limit, quota.used, `week starting ${startDate}`);
  }

  // Build week's stats - get data for all days in the week
  const endDateObj = new Date(startDate + 'T00:00:00');
  endDateObj.setDate(endDateObj.getDate() + 6); // 7 days total
  const endDateStr = endDateObj.toISOString().slice(0, 10);

  const weekStats = StatsService.getWeeklyStats(startDate, endDateStr);
  const weekDate = `w-${startDate}`;

  // Aggregate week's stats into a single InsightsLambdaStatsPayload
  const aggregatedStats = aggregateWeeklyStats(startDate, weekStats);

  const url = getInsightsUrl();
  const secret = getProxySecret();

  // Build session timelines for the entire week
  const weekSessions: SessionTimelineEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDaysYmd(startDate, i);
    const daySessions = buildSessionTimeline(dateStr);
    weekSessions.push(...daySessions);
  }
  const trimmedWeekSessions = weekSessions.slice(0, MAX_SESSION_TIMELINE);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      date: weekDate,
      stats: aggregatedStats,
      sessionTimeline: trimmedWeekSessions,
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
      id: `${weekDate}-${i}`,
      type: item.type,
      title: item.title,
      description: item.description,
      icon: item.icon,
      date: weekDate,
      created_at: now,
    });
    i++;
  }

  if (newInsights.length === 0) {
    throw new Error('Insights proxy returned no valid insight items');
  }

  const existing = readInsights().filter((ins) => ins.date !== weekDate);
  writeInsights([...existing, ...newInsights]);

  return newInsights;
}

function aggregateWeeklyStats(startDate: string, weekStats: DailyStats[]): InsightsLambdaStatsPayload {
  const aggregated: InsightsLambdaStatsPayload = {
    date: `w-${startDate}`,
    categoryTotals: {},
    totalTime: 0,
    focusScore: 0,
    contextSwitches: 0,
    longestSession: 0,
    topApps: [],
    productiveMinutes: 0,
    nonProductiveMinutes: 0,
    neutralMinutes: 0,
    productivitySwitches: 0,
    sessionCount: 0,
    appTransitionCount: 0,
    shortFocusSessionCount: 0,
    busiestWindow: null,
    focusSwitchSamples: [],
  };

  // Aggregate category totals
  const categoryMap = new Map<string, number>();
  const appMap = new Map<string, { category: string; duration: number }>();
  let totalFocusScore = 0;
  let daysWithData = 0;

  for (const day of weekStats) {
    if (day.totalTime > 0) daysWithData++;

    aggregated.totalTime += day.totalTime;
    aggregated.contextSwitches += day.contextSwitches;
    aggregated.productivitySwitches += day.productivitySwitches;
    aggregated.longestSession = Math.max(aggregated.longestSession, day.longestSession);
    aggregated.productiveMinutes += day.productiveMinutes;
    aggregated.nonProductiveMinutes += day.nonProductiveMinutes;
    aggregated.neutralMinutes += day.neutralMinutes;
    totalFocusScore += day.focusScore;

    // Aggregate category totals
    for (const [category, minutes] of Object.entries(day.categoryTotals)) {
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + minutes);
    }

    // Aggregate top apps
    for (const app of day.topApps) {
      const key = app.appName;
      if (appMap.has(key)) {
        const existing = appMap.get(key)!;
        existing.duration += app.duration;
      } else {
        appMap.set(key, { category: app.category, duration: app.duration });
      }
    }
  }

  aggregated.categoryTotals = Object.fromEntries(categoryMap);
  aggregated.focusScore = daysWithData > 0 ? Math.round(totalFocusScore / daysWithData) : 0;

  // Build topApps from aggregated map, sorted by duration
  aggregated.topApps = Array.from(appMap.entries())
    .map(([appName, { category, duration }]) => ({
      appName,
      category,
      duration,
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  return aggregated;
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getInsights(date?: string): Insight[] {
  const all = readInsights();
  if (!date) return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return all
    .filter((ins) => ins.date === date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
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

export function getWeeklyInsightsGenerateQuota(startDate: string): {
  weekStart: string;
  used: number;
  remaining: number;
  limit: number;
  canGenerate: boolean;
  cooldownRemainingMinutes: number;
  nextAvailableAt: string | null;
} {
  const all = readInsights();
  const weekInsights = all.filter((ins) => ins.date?.startsWith('w-') && ins.date === `w-${startDate}`);
  const used = new Set(weekInsights.map((ins) => ins.created_at)).size;
  const remaining = Math.max(0, WEEKLY_INSIGHTS_GENERATE_LIMIT - used);
  const latestWeeklyCreatedAt = weekInsights
    .map((ins) => ins.created_at)
    .sort((a, b) => b.localeCompare(a))[0];

  let cooldownRemainingMinutes = 0;
  let nextAvailableAt: string | null = null;
  if (latestWeeklyCreatedAt) {
    const nextMs = new Date(latestWeeklyCreatedAt).getTime() + WEEKLY_GENERATE_COOLDOWN_MS;
    const diff = nextMs - Date.now();
    if (Number.isFinite(diff) && diff > 0) {
      cooldownRemainingMinutes = Math.ceil(diff / 60_000);
      nextAvailableAt = new Date(nextMs).toISOString();
    }
  }

  const canGenerate = remaining > 0 && cooldownRemainingMinutes <= 0;
  return {
    weekStart: `w-${startDate}`,
    used,
    remaining,
    limit: WEEKLY_INSIGHTS_GENERATE_LIMIT,
    canGenerate,
    cooldownRemainingMinutes,
    nextAvailableAt,
  };
}
