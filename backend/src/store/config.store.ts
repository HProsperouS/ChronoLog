import fs from 'fs';
import path from 'path';
import type { CategoryRule, Insight, Settings } from '../types';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const INSIGHTS_FILE = path.join(DATA_DIR, 'insights.json');

interface PrivacyExclusions {
  excludedApps: string[];
  respectPrivateBrowsing: boolean;
}

interface Config {
  categoryRules: CategoryRule[];
  settings: Settings;
  privacy: PrivacyExclusions;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWrite(file: string, data: unknown): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export function readConfig(): Config {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    // Config file is required – fail fast so the issue is visible during development.
    console.error(`[config.store] Missing config file at ${CONFIG_FILE}`);
    throw new Error(`Missing config file at ${CONFIG_FILE}`);
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as Config;
  } catch {
    console.error(`[config.store] Failed to parse config file at ${CONFIG_FILE}`);
    throw new Error(`Invalid config file at ${CONFIG_FILE}`);
  }
}

export function writeConfig(config: Config): void {
  ensureDir();
  atomicWrite(CONFIG_FILE, config);
}

export function readInsights(): Insight[] {
  ensureDir();
  if (!fs.existsSync(INSIGHTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INSIGHTS_FILE, 'utf8')) as Insight[];
  } catch {
    return [];
  }
}

export function writeInsights(insights: Insight[]): void {
  ensureDir();
  atomicWrite(INSIGHTS_FILE, insights);
}

export type { PrivacyExclusions, Config };
