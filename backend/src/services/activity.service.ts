import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import * as ActivityStore from '../store/activity.store';
import { autoCategory } from './category.service';
import type { Activity, CreateActivityBody } from '../types';


const iconCache = new Map<string, Buffer | null>();

function isChronoLogSelfActivity(
  appName: string,
  windowTitle?: string
): boolean {
  const app = (appName ?? '').trim().toLowerCase();
  const title = (windowTitle ?? '').trim().toLowerCase();

  if (app === 'chronolog') return true;
  if (app === 'electron' && title.includes('chronolog')) return true;

  return false;
}

export function getAppIconBuffer(appName: string): Buffer | null {
  if (iconCache.has(appName)) return iconCache.get(appName) ?? null;

  if (os.platform() !== 'darwin') {
    iconCache.set(appName, null);
    return null;
  }

  const dirs = ['/Applications', path.join(os.homedir(), 'Applications')];
  let icnsPath: string | null = null;

  for (const dir of dirs) {
    const resourcesDir = path.join(dir, `${appName}.app`, 'Contents', 'Resources');
    if (!fs.existsSync(resourcesDir)) continue;
    const icnsFile = fs.readdirSync(resourcesDir).find(
      (f) => f.endsWith('.icns') && !f.startsWith('.')
    );
    if (icnsFile) {
      icnsPath = path.join(resourcesDir, icnsFile);
      break;
    }
  }

  if (!icnsPath) {
    iconCache.set(appName, null);
    return null;
  }

  try {
    const tmpFile = path.join(os.tmpdir(), `chronolog-icon-${Date.now()}.png`);
    execSync(
      `sips -s format png "${icnsPath}" --out "${tmpFile}" --resampleHeightWidth 64 64 2>/dev/null`,
      { stdio: 'pipe' }
    );
    const buffer = fs.readFileSync(tmpFile);
    try { fs.unlinkSync(tmpFile); } catch { /* ignore cleanup failures */ }
    iconCache.set(appName, buffer);
    return buffer;
  } catch {
    iconCache.set(appName, null);
    return null;
  }
}

/**
 * Derive calendar date (YYYY-MM-DD) in the server's **local timezone**
 * from an ISO timestamp. This keeps daily files aligned with what the user
 * sees as \"today\" on their machine, instead of UTC.
 */
function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const BROWSER_APP_RE = /chrome|safari|firefox|arc|brave|edge|opera/i;
const MERGE_GAP_MS = 15_000; // tolerate minor polling/network jitter

function normalizeBrowserUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    parsed.hash = '';
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    parsed.searchParams.delete('utm_term');
    parsed.searchParams.delete('utm_content');
    parsed.searchParams.delete('utm_id');
    parsed.searchParams.delete('utm_name');

    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function sessionKeyForActivity(a: Pick<Activity, 'appName' | 'windowTitle' | 'url'>): string {
  if (BROWSER_APP_RE.test(a.appName)) {
    const normalizedUrl = a.url ? normalizeBrowserUrl(a.url) : '';
    const normalizedTitle = (a.windowTitle ?? '').trim();
    return `${a.appName}|${normalizedUrl}|${normalizedTitle}`;
  }

  return `${a.appName}|${a.windowTitle ?? ''}`;
}

function canMergeAdjacent(prev: Activity, next: Activity): boolean {
  if (prev.category !== next.category) return false;
  if (sessionKeyForActivity(prev) !== sessionKeyForActivity(next)) return false;

  const prevEnd = new Date(prev.endTime).getTime();
  const nextStart = new Date(next.startTime).getTime();
  if (Number.isNaN(prevEnd) || Number.isNaN(nextStart)) return false;

  return nextStart <= prevEnd + MERGE_GAP_MS;
}

export function createActivity(body: CreateActivityBody): Activity {
  const isChronoLogActivity = isChronoLogSelfActivity(body.appName);
  const excludeFromAnalytics =
    body.excludeFromAnalytics ?? false;

  const date = toLocalDateString(body.startTime);
  const activities = ActivityStore
    .readDay(date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const category =
  body.category ??
  (excludeFromAnalytics
    ? 'ChronoLog'
    : autoCategory(body.appName, body.windowTitle, body.url));

  const activity: Activity = {
    id: ActivityStore.nextActivityId(activities),
    appName: body.appName,
    windowTitle: body.windowTitle,
    url: body.url,
    category,
    duration: body.duration,
    startTime: body.startTime,
    endTime: body.endTime,
    date,
    excludeFromAnalytics,
  };

  const prev = activities.at(-1);
  if (prev && canMergeAdjacent(prev, activity)) {
    const prevEnd = new Date(prev.endTime).getTime();
    const nextEnd = new Date(activity.endTime).getTime();
    const mergedEndMs = Math.max(prevEnd, nextEnd);
    const mergedStartMs = Math.min(
      new Date(prev.startTime).getTime(),
      new Date(activity.startTime).getTime()
    );
    prev.endTime = new Date(mergedEndMs).toISOString();
    prev.duration = Math.round(((mergedEndMs - mergedStartMs) / 60_000) * 10) / 10;
    // Keep the latest metadata for better categorization display.
    prev.windowTitle = activity.windowTitle ?? prev.windowTitle;
    prev.url = activity.url ?? prev.url;
    prev.excludeFromAnalytics =
    prev.excludeFromAnalytics || activity.excludeFromAnalytics;
    ActivityStore.writeDay(date, activities);
    return prev;
  }

  activities.push(activity);
  ActivityStore.writeDay(date, activities);
  return activity;
}

export function listActivities(date: string): Activity[] {
  return ActivityStore.readDay(date).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
}

export function listActivitiesRange(from: string, to: string): Activity[] {
  return ActivityStore.readRange(from, to);
}

export function deleteActivity(id: number, date: string): boolean {
  const activities = ActivityStore.readDay(date);
  const filtered = activities.filter((a) => a.id !== id);
  if (filtered.length === activities.length) return false;
  ActivityStore.writeDay(date, filtered);
  return true;
}

export function availableDates(): string[] {
  return ActivityStore.availableDates();
}

export function listInstalledApps(): string[] {
  const platform = os.platform();
  const names = new Set<string>();

  if (platform === 'darwin') {
    // macOS: scan /Applications and ~/Applications for .app bundles
    const dirs = ['/Applications', path.join(os.homedir(), 'Applications')];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith('.app')) names.add(entry.replace(/\.app$/, ''));
      }
    }
  } else if (platform === 'win32') {
    // Windows: use subdirectory names in Program Files as app names
    const dirs = [
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      path.join(os.homedir(), 'AppData', 'Local', 'Programs'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        try {
          const stat = fs.statSync(path.join(dir, entry));
          if (stat.isDirectory()) names.add(entry);
        } catch { /* skip entries we can't stat */ }
      }
    }
  } else {
    // Linux: parse Name= from .desktop files
    const desktopDir = '/usr/share/applications';
    if (fs.existsSync(desktopDir)) {
      for (const file of fs.readdirSync(desktopDir)) {
        if (!file.endsWith('.desktop')) continue;
        try {
          const content = fs.readFileSync(path.join(desktopDir, file), 'utf8');
          const match = content.match(/^Name=(.+)$/m);
          if (match) names.add(match[1].trim());
        } catch { /* skip unreadable files */ }
      }
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}
