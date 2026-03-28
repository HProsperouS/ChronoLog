import fs from 'fs';
import path from 'path';
import type { CategoryRule } from '../types';
import { scanInstalledApps } from '../services/app-scanner';
import {
  resolveInstalledApp,
  BROWSER_STUDY_KEYWORDS,
  BROWSER_DEEP_WORK_KEYWORDS,
  BROWSER_MEETING_KEYWORDS,
  BROWSER_GAMING_KEYWORDS,
  BROWSER_ENTERTAINMENT_KEYWORDS,
} from '../services/app-catalog';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const RULES_FILE = path.join(DATA_DIR, 'category-rules.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWrite(file: string, data: unknown): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}


function ruleDedupKey(rule: CategoryRule): string {
  const keywordKey = [...(rule.keywords ?? [])]
    .map((k) => k.trim().toLowerCase())
    .sort()
    .join('|');

  return [
    rule.appName.trim().toLowerCase(),
    rule.category.trim().toLowerCase(),
    rule.isAutomatic ? 'auto' : 'manual',
    keywordKey,
  ].join('::');
}

function dedupeRules(rules: CategoryRule[]): CategoryRule[] {
  const seen = new Set<string>();
  const result: CategoryRule[] = [];

  for (const rule of rules) {
    const key = ruleDedupKey(rule);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(rule);
  }

  return result;
}

function pushBrowserRuleSet(
  rules: CategoryRule[],
  appName: string,
  nextId: () => string
): void {
  rules.push({ id: nextId(), appName, category: 'Meetings', isAutomatic: false, keywords: BROWSER_MEETING_KEYWORDS });
  rules.push({ id: nextId(), appName, category: 'Gaming', isAutomatic: false, keywords: BROWSER_GAMING_KEYWORDS });
  rules.push({ id: nextId(), appName, category: 'Study', isAutomatic: false, keywords: BROWSER_STUDY_KEYWORDS });
  rules.push({ id: nextId(), appName, category: 'Deep Work', isAutomatic: false, keywords: BROWSER_DEEP_WORK_KEYWORDS });
  rules.push({ id: nextId(), appName, category: 'Entertainment', isAutomatic: false, keywords: BROWSER_ENTERTAINMENT_KEYWORDS });
}

function generateInitialRules(): CategoryRule[] {
  const installedApps = scanInstalledApps();
  const rules: CategoryRule[] = [];
  let id = 1;
  const nextId = () => String(id++);

  for (const app of installedApps) {
    const resolved = resolveInstalledApp(app);
    if (!resolved) continue;

    if (resolved.isBrowser) {
      pushBrowserRuleSet(rules, app.discoveredName, nextId);
      continue;
    }

    if (resolved.category) {
      rules.push({
        id: nextId(),
        appName: app.discoveredName,
        category: resolved.category,
        isAutomatic: true,
      });
    }
  }

  return dedupeRules(rules);
}

export function readRules(): CategoryRule[] {
  ensureDir();

  if (!fs.existsSync(RULES_FILE)) {
    const rules = generateInitialRules();
    atomicWrite(RULES_FILE, rules);
    return rules;
  }

  return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')) as CategoryRule[];
}

export function writeRules(rules: CategoryRule[]): void {
  ensureDir();
  atomicWrite(RULES_FILE, rules);
}