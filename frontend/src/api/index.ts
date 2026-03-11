/**
 * API client for ChronoLog backend.
 * VITE_API_URL must be set in frontend/.env — all calls go directly to the real backend.
 */

import type { Activity, CategoryRule, DailyStats, Insight } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL as string;

function parseActivity(raw: Record<string, unknown>): Activity {
  return {
    ...(raw as Omit<Activity, 'startTime' | 'endTime'>),
    startTime: new Date(raw.startTime as string),
    endTime:   new Date(raw.endTime   as string),
  };
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
  return await res.json() as T;
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function getActivities(date: string): Promise<Activity[]> {
  const data = await apiFetch<{ activities: Record<string, unknown>[] }>(`/api/activities?date=${date}`);
  return data.activities.map(parseActivity);
}

export async function getAvailableDates(): Promise<string[]> {
  const data = await apiFetch<{ dates: string[] }>('/api/activities/dates');
  return data.dates;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDailyStats(date: string): Promise<DailyStats> {
  const data = await apiFetch<{ stats: DailyStats }>(`/api/stats/daily?date=${date}`);
  return data.stats;
}

export async function getWeeklyStats(): Promise<DailyStats[]> {
  const data = await apiFetch<{ stats: DailyStats[] }>('/api/stats/weekly');
  return data.stats;
}

// ─── Category rules ───────────────────────────────────────────────────────────

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const data = await apiFetch<{ rules: CategoryRule[] }>('/api/category-rules');
  return data.rules;
}

export async function createCategoryRule(rule: Omit<CategoryRule, 'id'>): Promise<CategoryRule> {
  const data = await apiFetch<{ rule: CategoryRule }>('/api/category-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  return data.rule;
}

export async function updateCategoryRule(id: string, patch: Partial<CategoryRule>): Promise<CategoryRule> {
  const data = await apiFetch<{ rule: CategoryRule }>(`/api/category-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return data.rule;
}

export async function deleteCategoryRule(id: string): Promise<void> {
  await apiFetch(`/api/category-rules/${id}`, { method: 'DELETE' });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface TrackerSettings {
  pollIntervalSeconds:   number;
  idleThresholdMinutes:  number;
  retentionDays:         number;
}

export async function getSettings(): Promise<TrackerSettings> {
  const data = await apiFetch<{ settings: TrackerSettings }>('/api/category-rules/settings');
  return data.settings;
}

export async function updateSettings(patch: Partial<TrackerSettings>): Promise<TrackerSettings> {
  const data = await apiFetch<{ settings: TrackerSettings }>('/api/category-rules/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return data.settings;
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export async function getInsights(date?: string): Promise<Insight[]> {
  const query = date ? `?date=${date}` : '';
  const data = await apiFetch<{ insights: Insight[] }>(`/api/insights${query}`);
  return data.insights;
}

export async function generateInsights(date: string): Promise<Insight[]> {
  const data = await apiFetch<{ insights: Insight[] }>('/api/insights/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  return data.insights;
}

// ─── Settings: privacy & data management ───────────────────────────────────────

export interface PrivacySettings {
  excludedApps: string[];
  respectPrivateBrowsing: boolean;
}

export interface DataSummary {
  totalBytes: number;
  activityDays: number;
  firstDate?: string;
  lastDate?: string;
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const data = await apiFetch<{ privacy: PrivacySettings }>('/api/settings/privacy');
  return data.privacy;
}

export async function updatePrivacySettings(
  patch: Partial<PrivacySettings>,
): Promise<PrivacySettings> {
  const data = await apiFetch<{ privacy: PrivacySettings }>('/api/settings/privacy', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return data.privacy;
}

export async function getDataSummary(): Promise<DataSummary> {
  const data = await apiFetch<{ summary: DataSummary }>('/api/settings/data-summary');
  return data.summary;
}

export async function clearOldData(olderThanDays: number): Promise<DataSummary> {
  const data = await apiFetch<{ summary: DataSummary }>('/api/settings/data/clear-old', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ olderThanDays }),
  });
  return data.summary;
}

export async function deleteAllData(): Promise<DataSummary> {
  const data = await apiFetch<{ summary: DataSummary }>('/api/settings/data/all', {
    method: 'DELETE',
  });
  return data.summary;
}

export interface ExportPayload {
  config: unknown;
  activities: Record<string, Activity[]>;
  insights: Insight[];
}

export async function exportAllData(): Promise<ExportPayload> {
  return await apiFetch<ExportPayload>('/api/settings/data/export');
}
