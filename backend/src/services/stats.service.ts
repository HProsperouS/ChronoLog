import { readRange } from '../store/activity.store';
import type {
  Activity,
  Category,
  DailyStats,
  BusiestSwitchWindow,
  FocusSwitchSample,
  InsightsLambdaStatsPayload,
} from '../types';

const CATEGORIES: Category[] = [
  'Work', 'Study', 'Entertainment', 'Communication', 'Utilities', 'Uncategorized',
];

function emptyTotals(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
}

function analyticsOnly(activities: Activity[]): Activity[] {
  return activities.filter((a) => !a.excludeFromAnalytics);
}

/** Local calendar step for YYYY-MM-DD (matches frontend `addDaysYmd`; avoids UTC `toISOString` day shifts). */
function addDaysYmd(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const FOCUS: Category[] = ['Work', 'Study'];

/**
 * Same definition everywhere: Dashboard, Insights UI, GET /api/stats, and
 * InsightsLambdaStatsPayload.contextSwitches sent to Lambda.
 *
 * Walk the full session timeline in time order. Count each edge where the user
 * leaves Work/Study for any other category (including Utilities, Uncategorized,
 * Entertainment, Communication). We do not strip categories from the middle —
 * that would collapse Work→X→Work and undercount.
 */
function countContextSwitches(activities: Activity[]): number {
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  let switches = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].category;
    const curr = sorted[i].category;
    if (FOCUS.includes(prev) && !FOCUS.includes(curr)) switches++;
  }
  return switches;
}

/**
 * Longest continuous block of Work/Study time (minutes).
 * Activities within GAP_MINS of each other are merged into one block,
 * so 2-minute checkpoints don't fragment a long focus session.
 */
function longestFocusBlockMins(activities: Activity[]): number {
  const GAP_MINS = 5;
  const focusSorted = activities
    .filter((a) => FOCUS.includes(a.category))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (focusSorted.length === 0) return 0;

  let maxBlock = 0;
  let blockStartMs = new Date(focusSorted[0].startTime).getTime();
  let blockEndMs   = blockStartMs + focusSorted[0].duration * 60_000;

  for (let i = 1; i < focusSorted.length; i++) {
    const a         = focusSorted[i];
    const aStartMs  = new Date(a.startTime).getTime();
    const aEndMs    = aStartMs + a.duration * 60_000;
    const gapMins   = (aStartMs - blockEndMs) / 60_000;

    if (gapMins <= GAP_MINS) {
      if (aEndMs > blockEndMs) blockEndMs = aEndMs;
    } else {
      maxBlock     = Math.max(maxBlock, (blockEndMs - blockStartMs) / 60_000);
      blockStartMs = aStartMs;
      blockEndMs   = aEndMs;
    }
  }
  return Math.max(maxBlock, (blockEndMs - blockStartMs) / 60_000);
}

/**
 * Focus Score (0–100) — three dimensions:
 *   50% productive time ratio   (Work+Study / total)
 *   25% longest focus block     (capped at 90 min)
 *   25% context-switch penalty  (0 switches = full; 10+ = 0)
 */
function calcFocusScore(
  productiveTime: number,
  totalTime: number,
  contextSwitches: number,
  longestFocusMins: number,
): number {
  if (totalTime === 0) return 0;
  const ratioScore   = (productiveTime / totalTime) * 50;
  const sessionScore = Math.min(longestFocusMins / 90, 1) * 25;
  const switchScore  = Math.max(0, 1 - contextSwitches / 10) * 25;
  return Math.min(100, Math.round(ratioScore + sessionScore + switchScore));
}

function topApps(activities: Activity[], limit = 6) {
  const map = new Map<string, { appName: string; category: Category; duration: number }>();
  for (const a of activities) {
    const key = `${a.appName}|${a.category}`;
    const existing = map.get(key);
    if (existing) {
      existing.duration += a.duration;
    } else {
      map.set(key, { appName: a.appName, category: a.category, duration: a.duration });
    }
  }
  return [...map.values()].sort((a, b) => b.duration - a.duration).slice(0, limit);
}

const SHORT_FOCUS_MINS = 3;
const BUSY_BUCKET_MINS = 30;
const SWITCH_SAMPLE_CAP = 8;

function computeInsightMetrics(activities: Activity[]): {
  sessionCount: number;
  appTransitionCount: number;
  shortFocusSessionCount: number;
  busiestWindow: BusiestSwitchWindow | null;
  focusSwitchSamples: FocusSwitchSample[];
} {
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const sessionCount = sorted.length;

  type Transition = { bucket: number; timeLocal: string; from: Activity; to: Activity };
  const transitions: Transition[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.appName !== curr.appName || prev.category !== curr.category) {
      const d = new Date(curr.startTime);
      const mins = d.getHours() * 60 + d.getMinutes();
      const bucket = Math.floor(mins / BUSY_BUCKET_MINS);
      const timeLocal = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      transitions.push({ bucket, timeLocal, from: prev, to: curr });
    }
  }

  const appTransitionCount = transitions.length;
  const shortFocusSessionCount = sorted.filter(
    (a) => FOCUS.includes(a.category) && a.duration < SHORT_FOCUS_MINS,
  ).length;

  const bucketCounts = new Map<number, number>();
  for (const t of transitions) {
    bucketCounts.set(t.bucket, (bucketCounts.get(t.bucket) ?? 0) + 1);
  }
  let bestBucket: number | null = null;
  let bestCount = 0;
  for (const [b, c] of bucketCounts) {
    if (c > bestCount) {
      bestCount = c;
      bestBucket = b;
    }
  }

  let busiestWindow: BusiestSwitchWindow | null = null;
  if (bestBucket !== null && bestCount > 0) {
    const startM = bestBucket * BUSY_BUCKET_MINS;
    const endM = startM + BUSY_BUCKET_MINS;
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    busiestWindow = {
      windowStartLocal: fmt(startM),
      windowEndLocal: fmt(endM),
      transitionCount: bestCount,
    };
  }

  const focusSwitchSamples: FocusSwitchSample[] = transitions.slice(0, SWITCH_SAMPLE_CAP).map((t) => ({
    timeLocal: t.timeLocal,
    fromApp: t.from.appName,
    toApp: t.to.appName,
    fromCategory: t.from.category,
    toCategory: t.to.category,
  }));

  return {
    sessionCount,
    appTransitionCount,
    shortFocusSessionCount,
    busiestWindow,
    focusSwitchSamples,
  };
}

function buildDailyStats(date: string, activities: Activity[], topAppsLimit = 6): DailyStats {
  const categoryTotals = emptyTotals();
  let longestSession = 0;
  for (const a of activities) {
    categoryTotals[a.category] += a.duration;
    if (a.duration > longestSession) longestSession = a.duration;
  }

  const totalTime = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const productiveTime = categoryTotals.Work + categoryTotals.Study;
  const switches = countContextSwitches(activities);
  const focusScore = calcFocusScore(productiveTime, totalTime, switches, longestFocusBlockMins(activities));

  return {
    date,
    categoryTotals,
    totalTime,
    focusScore,
    contextSwitches: switches,
    longestSession,
    topApps: topApps(activities, topAppsLimit),
  };
}

export function getDailyStats(date: string): DailyStats {
  const activities = analyticsOnly(readRange(date, date));
  return buildDailyStats(date, activities);
}

/** Full stats + fragmentation for insights Lambda only (not exposed on `/api/stats`). */
export function getInsightsLambdaStats(date: string): InsightsLambdaStatsPayload {
  const activities = analyticsOnly(readRange(date, date));
  const base = buildDailyStats(date, activities);
  return { ...base, ...computeInsightMetrics(activities) };
}

export function getWeeklyStats(from: string, to: string): DailyStats[] {
  const activities = analyticsOnly(readRange(from, to));

  const byDate = new Map<string, Activity[]>();
  for (const a of activities) {
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date)!.push(a);
  }

  const result: DailyStats[] = [];
  let cur = from;
  while (cur <= to) {
    const dayActivities = byDate.get(cur) ?? [];
    result.push(buildDailyStats(cur, dayActivities, 3));
    cur = addDaysYmd(cur, 1);
  }

  return result;
}
