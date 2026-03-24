import { readRules, writeRules } from '../store/category-rules.store';
import type { Category, CategoryRule, CreateCategoryRuleBody, UpdateCategoryRuleBody } from '../types';

export function autoCategory(
  appName: string,
  windowTitle?: string,
  url?: string
): Category {
  const rules = readRules();
  const searchText = [windowTitle, url].filter(Boolean).join(' ').toLowerCase();
  const appLower = appName.toLowerCase();

  // 1. Exact automatic match
  const autoMatch = rules.find(
    (r) => r.isAutomatic && r.appName.toLowerCase() === appLower
  );
  if (autoMatch) return autoMatch.category;

  // 2. Keyword match (non-automatic rules, e.g. browser URL/title keywords)
  const keywordRules = rules.filter(
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
  return readRules();
}

export function createRule(body: CreateCategoryRuleBody): CategoryRule {
  const rules = readRules();
  const rule: CategoryRule = {
    id: String(Date.now()),
    appName: body.appName,
    category: body.category,
    keywords: body.keywords,
    isAutomatic: body.isAutomatic,
  };
  rules.push(rule);
  writeRules(rules);
  return rule;
}

export function updateRule(id: string, body: UpdateCategoryRuleBody): CategoryRule | undefined {
  const rules = readRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return undefined;
  if (body.category !== undefined) rule.category = body.category;
  if (body.keywords !== undefined) rule.keywords = body.keywords;
  if (body.isAutomatic !== undefined) rule.isAutomatic = body.isAutomatic;
  writeRules(rules);
  return rule;
}

export function deleteRule(id: string): boolean {
  const rules = readRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  writeRules(filtered);
  return true;
}
