import { readConfig, writeConfig } from '../store/config.store';
import type { Category, CategoryRule, CreateCategoryRuleBody, UpdateCategoryRuleBody } from '../types';

export function autoCategory(
  appName: string,
  windowTitle?: string,
  url?: string
): Category {
  const { categoryRules } = readConfig();
  const searchText = [windowTitle, url].filter(Boolean).join(' ').toLowerCase();
  const appLower = appName.toLowerCase();

  // 1. Exact automatic match
  const autoMatch = categoryRules.find(
    (r) => r.isAutomatic && r.appName.toLowerCase() === appLower
  );
  if (autoMatch) return autoMatch.category;

  // 2. Keyword match (non-automatic rules, e.g. browser URL/title keywords)
  const keywordRules = categoryRules.filter(
    (r) => !r.isAutomatic && r.appName.toLowerCase() === appLower && r.keywords?.length
  );
  for (const rule of keywordRules) {
    if (rule.keywords!.some((kw) => searchText.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }

  return 'Uncategorized';
}

export function listRules(): CategoryRule[] {
  return readConfig().categoryRules;
}

export function createRule(body: CreateCategoryRuleBody): CategoryRule {
  const config = readConfig();
  const rule: CategoryRule = {
    id: String(Date.now()),
    appName: body.appName,
    category: body.category,
    keywords: body.keywords,
    isAutomatic: body.isAutomatic,
  };
  config.categoryRules.push(rule);
  writeConfig(config);
  return rule;
}

export function updateRule(id: string, body: UpdateCategoryRuleBody): CategoryRule | undefined {
  const config = readConfig();
  const rule = config.categoryRules.find((r) => r.id === id);
  if (!rule) return undefined;
  if (body.category !== undefined) rule.category = body.category;
  if (body.keywords !== undefined) rule.keywords = body.keywords;
  if (body.isAutomatic !== undefined) rule.isAutomatic = body.isAutomatic;
  writeConfig(config);
  return rule;
}

export function deleteRule(id: string): boolean {
  const config = readConfig();
  const before = config.categoryRules.length;
  config.categoryRules = config.categoryRules.filter((r) => r.id !== id);
  if (config.categoryRules.length === before) return false;
  writeConfig(config);
  return true;
}

export function getSettings() {
  return readConfig().settings;
}

export function updateSettings(
  patch: Partial<{
    trackingEnabled:      boolean;
    idleDetectionEnabled: boolean;
    notificationsEnabled: boolean;
    launchAtStartup:      boolean;
    runInBackground:      boolean;
    pollIntervalSeconds:  number;
    idleThresholdMinutes: number;
    retentionDays:        number;
  }>,
) {
  const config = readConfig();
  Object.assign(config.settings, patch);
  writeConfig(config);
  return config.settings;
}
