import fs from 'fs';
import path from 'path';
import { readSettings, writeSettings, type PrivacyExclusions, type SettingsConfig } from '../store/settings.store';
import { readRules } from '../store/category-rules.store';
import { readInsights } from '../store/config.store';
import * as ActivityStore from '../store/activity.store';
import type { Activity, CategoryRule, Insight } from '../types';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const ACTIVITIES_DIR = path.join(DATA_DIR, 'activities');

export interface DataSummary {
  totalBytes: number;
  activityDays: number;
  firstDate?: string;
  lastDate?: string;
}

export function getSettings(): SettingsConfig['settings'] {
  return readSettings().settings;
}

export function updateSettings(
  patch: Partial<SettingsConfig['settings']>,
): SettingsConfig['settings'] {
  const config = readSettings();
  Object.assign(config.settings, patch);
  writeSettings(config);
  return config.settings;
}

export function getPrivacy(): PrivacyExclusions {
  return readSettings().privacy;
}

export function updatePrivacy(patch: Partial<PrivacyExclusions>): PrivacyExclusions {
  const config = readSettings();
  config.privacy = { ...config.privacy, ...patch };
  writeSettings(config);
  return config.privacy;
}

export function getDataSummary(): DataSummary {
  let totalBytes = 0;
  let activityDays = 0;
  let firstDate: string | undefined;
  let lastDate: string | undefined;

  if (fs.existsSync(DATA_DIR)) {
    for (const entry of fs.readdirSync(DATA_DIR, { withFileTypes: true })) {
      const fullPath = path.join(DATA_DIR, entry.name);
      if (entry.isFile()) {
        totalBytes += fs.statSync(fullPath).size;
      }
    }
  }

  if (fs.existsSync(ACTIVITIES_DIR)) {
    const files = fs
      .readdirSync(ACTIVITIES_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort();

    activityDays = files.length;
    if (files.length > 0) {
      firstDate = files[0].replace('.json', '');
      lastDate = files[files.length - 1].replace('.json', '');
    }
  }

  return { totalBytes, activityDays, firstDate, lastDate };
}

export function clearDataOlderThan(days: number): void {
  if (!fs.existsSync(ACTIVITIES_DIR)) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  for (const file of fs.readdirSync(ACTIVITIES_DIR)) {
    if (!file.endsWith('.json')) continue;
    const date = file.replace('.json', '');
    if (date < cutoffStr) {
      fs.unlinkSync(path.join(ACTIVITIES_DIR, file));
    }
  }
}

export function deleteAllData(): void {
  if (!fs.existsSync(DATA_DIR)) return;
  for (const entry of fs.readdirSync(DATA_DIR, { withFileTypes: true })) {
    const fullPath = path.join(DATA_DIR, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

export interface ExportPayload {
  settings: SettingsConfig;
  categoryRules: CategoryRule[];
  activities: Record<string, Activity[]>;
  insights: Insight[];
}

export function exportAllData(): ExportPayload {
  const settings = readSettings();
  const categoryRules = readRules();
  const insights = readInsights();
  const activities: Record<string, Activity[]> = {};

  if (fs.existsSync(ACTIVITIES_DIR)) {
    for (const file of fs.readdirSync(ACTIVITIES_DIR)) {
      if (!file.endsWith('.json')) continue;
      const date = file.replace('.json', '');
      const fullPath = path.join(ACTIVITIES_DIR, file);
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        activities[date] = JSON.parse(raw) as Activity[];
      } catch {
        // skip malformed file
      }
    }
  }

  return { settings, categoryRules, activities, insights };
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeImportedActivity(raw: any, date: string): Activity | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.id !== 'number') return null;
  if (typeof a.appName !== 'string' || a.appName.trim().length === 0) return null;
  if (typeof a.duration !== 'number' || !Number.isFinite(a.duration) || a.duration < 0) return null;
  if (typeof a.startTime !== 'string' || typeof a.endTime !== 'string') return null;
  if (typeof a.category !== 'string' || a.category.trim().length === 0) return null;

  return {
    id: a.id,
    appName: a.appName,
    windowTitle: typeof a.windowTitle === 'string' ? a.windowTitle : undefined,
    url: typeof a.url === 'string' ? a.url : undefined,
    category: a.category as any,
    duration: a.duration,
    startTime: a.startTime,
    endTime: a.endTime,
    date,
    excludeFromAnalytics: typeof a.excludeFromAnalytics === 'boolean' ? a.excludeFromAnalytics : undefined,
  };
}

export function importActivities(payload: { activitiesByDate: Record<string, unknown> }): DataSummary {
  const out: Record<string, Activity[]> = {};
  const entries = Object.entries(payload.activitiesByDate ?? {});

  for (const [date, rows] of entries) {
    if (!isYmd(date)) continue;
    if (!Array.isArray(rows)) continue;
    const normalized: Activity[] = [];
    for (const r of rows) {
      const a = normalizeImportedActivity(r, date);
      if (a) normalized.push(a);
    }
    out[date] = normalized;
  }

  // Write each day file (overwrite).
  for (const [date, rows] of Object.entries(out)) {
    ActivityStore.writeDay(date, rows);
  }

  return getDataSummary();
}
