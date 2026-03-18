import { readRange } from '../store/activity.store';
import type { Activity, Category, DailyStats } from '../types';

const CATEGORIES: Category[] = [
  'Work', 'Study', 'Entertainment', 'Communication', 'Utilities', 'Uncategorized',
];

function emptyTotals(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
}

const FOCUS: Category[] = ['Work', 'Study'];

function countContextSwitches(activities: Activity[]): number {
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const IGNORE: Category[] = ['Utilities', 'Uncategorized'];
  const relevant = sorted.filter((a) => !IGNORE.includes(a.category));
  let switches = 0;
  for (let i = 1; i < relevant.length; i++) {
    const prev = relevant[i - 1].category;
    const curr = relevant[i].category;
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

export function getDailyStats(date: string): DailyStats {
  const activities = readRange(date, date);
  const categoryTotals = emptyTotals();

  let longestSession = 0;
  for (const a of activities) {
    categoryTotals[a.category] += a.duration;
    if (a.duration > longestSession) longestSession = a.duration;
  }

  const totalTime      = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const productiveTime = categoryTotals.Work + categoryTotals.Study;
  const switches       = countContextSwitches(activities);
  const focusScore     = calcFocusScore(productiveTime, totalTime, switches, longestFocusBlockMins(activities));

  return {
    date,
    categoryTotals,
    totalTime,
    focusScore,
    contextSwitches: switches,
    longestSession,
    topApps: topApps(activities),
  };
}

export function getWeeklyStats(from: string, to: string): DailyStats[] {
  const activities = readRange(from, to);

  const byDate = new Map<string, Activity[]>();
  for (const a of activities) {
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date)!.push(a);
  }

  const result: DailyStats[] = [];
  const current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const dayActivities = byDate.get(dateStr) ?? [];
    const categoryTotals = emptyTotals();
    let longestSession = 0;

    for (const a of dayActivities) {
      categoryTotals[a.category] += a.duration;
      if (a.duration > longestSession) longestSession = a.duration;
    }

    const totalTime      = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
    const productiveTime = categoryTotals.Work + categoryTotals.Study;
    const switches       = countContextSwitches(dayActivities);
    const focusScore     = calcFocusScore(productiveTime, totalTime, switches, longestFocusBlockMins(dayActivities));

    result.push({
      date: dateStr,
      categoryTotals,
      totalTime,
      focusScore,
      contextSwitches: switches,
      longestSession,
      topApps: topApps(dayActivities, 3),
    });

    current.setDate(current.getDate() + 1);
  }

  return result;
}
