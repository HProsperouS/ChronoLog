/**
 * API client for ChronoLog backend.
 *
 * HOW TO SWITCH FROM MOCK DATA TO REAL BACKEND:
 *   Add  VITE_API_URL=http://localhost:3001  to your frontend/.env file.
 *   That's it – all functions below will automatically call the real API.
 *
 * When VITE_API_URL is not set, mock JSON files in src/data/ are used instead.
 */

import type { Activity, CategoryRule, DailyStats, Insight } from '../types';

// ─── raw JSON imports (used only when VITE_API_URL is not set) ────────────────
import mockActivities     from '../data/mock-activities.json';
import mockStatsDaily     from '../data/mock-stats-daily.json';
import mockStatsWeekly    from '../data/mock-stats-weekly.json';
import mockCategoryRules  from '../data/mock-category-rules.json';
import mockInsights       from '../data/mock-insights.json';

const BASE_URL = import.meta.env.VITE_API_URL as string | undefined;

// Converts ISO strings from JSON/API into Date objects that components expect
function parseActivity(raw: Record<string, unknown>): Activity {
  return {
    ...(raw as Omit<Activity, 'startTime' | 'endTime'>),
    startTime: new Date(raw.startTime as string),
    endTime:   new Date(raw.endTime   as string),
  };
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function getActivities(date: string): Promise<Activity[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/activities?date=${date}`);
    const data = await res.json() as { activities: Record<string, unknown>[] };
    return data.activities.map(parseActivity);
  }
  const filtered = (mockActivities as Record<string, unknown>[]).filter(
    (a) => (a.date as string) === date
  );
  return filtered.map(parseActivity);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDailyStats(date: string): Promise<DailyStats> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/stats/daily?date=${date}`);
    const data = await res.json() as { stats: DailyStats };
    return data.stats;
  }
  const weekly = mockStatsWeekly as DailyStats[];
  const found = weekly.find((s) => s.date === date);
  // Fall back to the detailed daily mock if the weekly entry has no topApps data
  if (found && found.topApps.length > 0) return found;
  if (found) return { ...found, topApps: (mockStatsDaily as DailyStats).topApps };
  return mockStatsDaily as DailyStats;
}

export async function getWeeklyStats(): Promise<DailyStats[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/stats/weekly`);
    const data = await res.json() as { stats: DailyStats[] };
    return data.stats;
  }
  return mockStatsWeekly as DailyStats[];
}

// ─── Category rules ───────────────────────────────────────────────────────────

export async function getCategoryRules(): Promise<CategoryRule[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/category-rules`);
    const data = await res.json() as { rules: CategoryRule[] };
    return data.rules;
  }
  return mockCategoryRules as CategoryRule[];
}

export async function createCategoryRule(
  rule: Omit<CategoryRule, 'id'>
): Promise<CategoryRule> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/category-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const data = await res.json() as { rule: CategoryRule };
    return data.rule;
  }
  return { ...rule, id: String(Date.now()) };
}

export async function updateCategoryRule(
  id: string,
  patch: Partial<CategoryRule>
): Promise<CategoryRule> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/category-rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json() as { rule: CategoryRule };
    return data.rule;
  }
  return patch as CategoryRule;
}

export async function deleteCategoryRule(id: string): Promise<void> {
  if (BASE_URL) {
    await fetch(`${BASE_URL}/api/category-rules/${id}`, { method: 'DELETE' });
  }
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export async function getInsights(date?: string): Promise<Insight[]> {
  if (BASE_URL) {
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${BASE_URL}/api/insights${query}`);
    const data = await res.json() as { insights: Insight[] };
    return data.insights;
  }
  const all = mockInsights as Insight[];
  return date ? all.filter((i) => i.date === date) : all;
}

export async function generateInsights(date: string): Promise<Insight[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/insights/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    const data = await res.json() as { insights: Insight[] };
    return data.insights;
  }
  return mockInsights as Insight[];
}
