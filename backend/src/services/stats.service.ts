import { readRange } from '../store/activity.store';
import type { Activity, Category, DailyStats } from '../types';

const CATEGORIES: Category[] = [
  'Work', 'Study', 'Entertainment', 'Communication', 'Utilities', 'Uncategorized',
];

function emptyTotals(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
}

function countContextSwitches(activities: Activity[]): number {
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const IGNORE: Category[] = ['Utilities', 'Uncategorized'];
  const relevant = sorted.filter((a) => !IGNORE.includes(a.category));
  let switches = 0;
  for (let i = 1; i < relevant.length; i++) {
    if (relevant[i].category !== relevant[i - 1].category) switches++;
  }
  return switches;
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

  const totalTime = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
  const productiveTime = categoryTotals.Work + categoryTotals.Study;
  const focusScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

  return {
    date,
    categoryTotals,
    totalTime,
    focusScore,
    contextSwitches: countContextSwitches(activities),
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

    const totalTime = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
    const productiveTime = categoryTotals.Work + categoryTotals.Study;
    const focusScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

    result.push({
      date: dateStr,
      categoryTotals,
      totalTime,
      focusScore,
      contextSwitches: countContextSwitches(dayActivities),
      longestSession,
      topApps: topApps(dayActivities, 3),
    });

    current.setDate(current.getDate() + 1);
  }

  return result;
}
