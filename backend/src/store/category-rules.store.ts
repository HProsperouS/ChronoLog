import fs from 'fs';
import path from 'path';
import type { CategoryRule } from '../types';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const RULES_FILE = path.join(DATA_DIR, 'category-rules.json');

const DEFAULT_RULES: CategoryRule[] = [
  { id: '1',  appName: 'Code',            category: 'Work',          isAutomatic: true },
  { id: '2',  appName: 'code',            category: 'Work',          isAutomatic: true },
  { id: '3',  appName: 'idea64',          category: 'Work',          isAutomatic: true },
  { id: '4',  appName: 'WebStorm',        category: 'Work',          isAutomatic: true },
  { id: '5',  appName: 'Terminal',        category: 'Work',          isAutomatic: true },
  { id: '6',  appName: 'cmd',             category: 'Work',          isAutomatic: true },
  { id: '7',  appName: 'powershell',      category: 'Work',          isAutomatic: true },
  { id: '8',  appName: 'WindowsTerminal', category: 'Work',          isAutomatic: true },
  { id: '9',  appName: 'Slack',           category: 'Communication', isAutomatic: true },
  { id: '10', appName: 'Discord',         category: 'Communication', isAutomatic: true },
  { id: '11', appName: 'Zoom',            category: 'Communication', isAutomatic: true },
  { id: '12', appName: 'Spotify',         category: 'Entertainment', isAutomatic: true },
  { id: '13', appName: 'Notion',          category: 'Study',         isAutomatic: true },
  { id: '14', appName: 'Obsidian',        category: 'Study',         isAutomatic: true },
  {
    id: '15',
    appName: 'Chrome',
    category: 'Work',
    isAutomatic: false,
    keywords: ['github', 'stackoverflow', 'docs', 'mdn', 'localhost'],
  },
  {
    id: '16',
    appName: 'chrome',
    category: 'Entertainment',
    isAutomatic: false,
    keywords: ['youtube', 'netflix', 'twitch', 'reddit'],
  },
  {
    id: '17',
    appName: 'msedge',
    category: 'Work',
    isAutomatic: false,
    keywords: ['github', 'stackoverflow', 'docs', 'localhost'],
  },
];

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWrite(file: string, data: unknown): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export function readRules(): CategoryRule[] {
  ensureDir();
  if (!fs.existsSync(RULES_FILE)) {
    console.log('[category-rules.store] First launch — seeding default category-rules.json');
    atomicWrite(RULES_FILE, DEFAULT_RULES);
    return structuredClone(DEFAULT_RULES);
  }
  try {
    return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')) as CategoryRule[];
  } catch {
    console.error('[category-rules.store] Failed to parse category-rules.json — resetting to defaults');
    atomicWrite(RULES_FILE, DEFAULT_RULES);
    return structuredClone(DEFAULT_RULES);
  }
}

export function writeRules(rules: CategoryRule[]): void {
  ensureDir();
  atomicWrite(RULES_FILE, rules);
}
