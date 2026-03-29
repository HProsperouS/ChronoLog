import fs from 'fs';
import path from 'path';
import type { CategoryRule, RuleCondition } from '../types';
import { scanInstalledApps } from '../services/app-scanner';
import {
  resolveInstalledApp,
  BROWSER_STUDY_KEYWORDS,
  BROWSER_DEEP_WORK_KEYWORDS,
  BROWSER_MEETING_KEYWORDS,
  BROWSER_GAMING_KEYWORDS,
  BROWSER_ENTERTAINMENT_KEYWORDS,
  BROWSER_ADVANCED_RULE_BLUEPRINTS,
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

function normalizeKeywords(values?: string[]): string[] {
  return [...(values ?? [])]
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

function normalizeConditions(values?: RuleCondition[]): string {
  return [...(values ?? [])]
    .map((condition) => ({
      field: String(condition.field),
      operator: String(condition.operator),
      value: condition.value.trim().toLowerCase(),
    }))
    .filter((condition) => condition.value.length > 0)
    .sort((a, b) => {
      if (a.field !== b.field) return a.field < b.field ? -1 : 1;
      if (a.operator !== b.operator) return a.operator < b.operator ? -1 : 1;
      return a.value.localeCompare(b.value);
    })
    .map((condition) => `${condition.field}:${condition.operator}:${condition.value}`)
    .join('|');
}

function ruleDedupKey(rule: CategoryRule): string {
  const keywordKey = normalizeKeywords(rule.keywords).join('|');
  const conditionKey = normalizeConditions(rule.conditions);
  const matchMode = rule.matchMode ?? 'any';

  return [
    rule.appName.trim().toLowerCase(),
    rule.category.trim().toLowerCase(),
    rule.isAutomatic ? 'auto' : 'manual',
    matchMode,
    keywordKey,
    conditionKey,
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

function pushSimpleRule(
  rules: CategoryRule[],
  nextId: () => string,
  appName: string,
  category: CategoryRule['category'],
  keywords: string[],
): void {
  rules.push({
    id: nextId(),
    appName,
    category,
    isAutomatic: false,
    keywords,
    matchMode: 'any',
    conditions: [],
  });
}

function makeTitleContainsCondition(value: string): RuleCondition {
  return {
    field: 'windowTitle',
    operator: 'contains',
    value,
  };
}

function pushAdvancedAllRule(
  rules: CategoryRule[],
  nextId: () => string,
  appName: string,
  category: CategoryRule['category'],
  conditions: RuleCondition[],
): void {
  rules.push({
    id: nextId(),
    appName,
    category,
    isAutomatic: false,
    keywords: [],
    matchMode: 'all',
    conditions,
  });
}

function pushBrowserRuleSet(
  rules: CategoryRule[],
  appName: string,
  nextId: () => string
): void {
  // Broad fallback defaults
  pushSimpleRule(rules, nextId, appName, 'Meetings', BROWSER_MEETING_KEYWORDS);
  pushSimpleRule(rules, nextId, appName, 'Gaming', BROWSER_GAMING_KEYWORDS);
  pushSimpleRule(rules, nextId, appName, 'Study', BROWSER_STUDY_KEYWORDS);
  pushSimpleRule(rules, nextId, appName, 'Deep Work', BROWSER_DEEP_WORK_KEYWORDS);
  pushSimpleRule(rules, nextId, appName, 'Entertainment', BROWSER_ENTERTAINMENT_KEYWORDS);

  // More specific advanced defaults
  for (const blueprint of BROWSER_ADVANCED_RULE_BLUEPRINTS) {
    pushAdvancedAllRule(
      rules,
      nextId,
      appName,
      blueprint.category,
      blueprint.terms.map(makeTitleContainsCondition),
    );
  }
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