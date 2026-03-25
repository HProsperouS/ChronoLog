import fs from 'fs';
import path from 'path';
import type { Settings } from '../types';

export interface PrivacyExclusions {
  excludedApps: string[];
  respectPrivateBrowsing: boolean;
}

export interface SettingsConfig {
  settings: Settings;
  privacy: PrivacyExclusions;
}

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS_CONFIG: SettingsConfig = {
  settings: {
    trackingEnabled:      true,
    idleDetectionEnabled: true,
    notificationsEnabled: true,
    launchAtStartup:      true,
    runInBackground:      true,
    pollIntervalSeconds:  5,
    idleThresholdMinutes: 5,
    retentionDays:        90,
  },
  privacy: {
    excludedApps: [],
    respectPrivateBrowsing: true,
  },
};

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function sleepMs(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy wait
  }
}

function atomicWrite(file: string, data: unknown): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');

  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      if (fs.existsSync(file)) {
        try {
          fs.rmSync(file, { force: true });
        } catch {
          // ignore and let rename try anyway
        }
      }

      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      lastError = err;
      sleepMs(100);
    }
  }

  throw lastError;
}

export function readSettings(): SettingsConfig {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    console.log('[settings.store] First launch — seeding default settings.json');
    atomicWrite(SETTINGS_FILE, DEFAULT_SETTINGS_CONFIG);
    return structuredClone(DEFAULT_SETTINGS_CONFIG);
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) as SettingsConfig;
  } catch {
    console.error('[settings.store] Failed to parse settings.json — resetting to defaults');
    atomicWrite(SETTINGS_FILE, DEFAULT_SETTINGS_CONFIG);
    return structuredClone(DEFAULT_SETTINGS_CONFIG);
  }
}

export function writeSettings(config: SettingsConfig): void {
  ensureDir();
  atomicWrite(SETTINGS_FILE, config);
}
