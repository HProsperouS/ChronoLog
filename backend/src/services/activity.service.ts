import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import * as ActivityStore from '../store/activity.store';
import { autoCategory } from './category.service';
import type { Activity, CreateActivityBody } from '../types';

const iconCache = new Map<string, Buffer | null>();

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

function toDateString(iso: string): string {
  return iso.slice(0, 10);
}

export function createActivity(body: CreateActivityBody): Activity {
  const date = toDateString(body.startTime);
  const activities = ActivityStore.readDay(date);

  const category = body.category ?? autoCategory(body.appName, body.windowTitle, body.url);

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
  };

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
