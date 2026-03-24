import fs from 'fs';
import path from 'path';
import { readSettings, writeSettings, type PrivacyExclusions, type SettingsConfig } from '../store/settings.store';
import { readRules } from '../store/category-rules.store';
import { readInsights } from '../store/config.store';
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
