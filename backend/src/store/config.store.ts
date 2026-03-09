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

const DEFAULT_CONFIG: Config = {
  categoryRules: [
    { id: '1', appName: 'Code',        category: 'Work',          isAutomatic: true },
    { id: '2', appName: 'code',        category: 'Work',          isAutomatic: true },
    { id: '3', appName: 'idea64',      category: 'Work',          isAutomatic: true },
    { id: '4', appName: 'WebStorm',    category: 'Work',          isAutomatic: true },
    { id: '5', appName: 'Terminal',    category: 'Work',          isAutomatic: true },
    { id: '6', appName: 'cmd',         category: 'Work',          isAutomatic: true },
    { id: '7', appName: 'powershell',  category: 'Work',          isAutomatic: true },
    { id: '8', appName: 'WindowsTerminal', category: 'Work',      isAutomatic: true },
    { id: '9', appName: 'Slack',       category: 'Communication', isAutomatic: true },
    { id: '10', appName: 'Discord',    category: 'Communication', isAutomatic: true },
    { id: '11', appName: 'Zoom',       category: 'Communication', isAutomatic: true },
    { id: '12', appName: 'Spotify',    category: 'Entertainment', isAutomatic: true },
    { id: '13', appName: 'Notion',     category: 'Study',         isAutomatic: true },
    { id: '14', appName: 'Obsidian',   category: 'Study',         isAutomatic: true },
    { id: '15', appName: 'Chrome',     category: 'Work',          isAutomatic: false,
      keywords: ['github', 'stackoverflow', 'docs', 'mdn', 'localhost'] },
    { id: '16', appName: 'chrome',     category: 'Entertainment', isAutomatic: false,
      keywords: ['youtube', 'netflix', 'twitch', 'reddit'] },
    { id: '17', appName: 'msedge',     category: 'Work',          isAutomatic: false,
      keywords: ['github', 'stackoverflow', 'docs', 'localhost'] },
  ],
  settings: {
    pollIntervalSeconds: 5,
    idleThresholdMinutes: 5,
    retentionDays: 90,
  },
  privacy: {
    excludedApps: ['1Password', 'Bitwarden', 'KeePass'],
    respectPrivateBrowsing: true,
  },
};

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
  if (!fs.existsSync(CONFIG_FILE)) return structuredClone(DEFAULT_CONFIG);
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as Partial<Config>;
    const config: Config = {
      categoryRules: parsed.categoryRules ?? structuredClone(DEFAULT_CONFIG.categoryRules),
      settings: {
        ...structuredClone(DEFAULT_CONFIG.settings),
        ...(parsed.settings ?? {}),
      },
      privacy: parsed.privacy ?? structuredClone(DEFAULT_CONFIG.privacy),
    };
    return config;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
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
