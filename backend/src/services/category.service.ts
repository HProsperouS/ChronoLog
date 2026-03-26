import { readRules, writeRules } from '../store/category-rules.store';
import type {
  Category,
  CategoryRule,
  CreateCategoryRuleBody,
  UpdateCategoryRuleBody,
} from '../types';

function normalize(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeKeywords(values?: string[]): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

function extractHostname(rawUrl?: string): string {
  if (!rawUrl) return '';

  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function matchesKeyword(
  keyword: string,
  windowTitle?: string,
  url?: string
): boolean {
  const k = normalize(keyword);
  if (!k) return false;

  const title = normalize(windowTitle);
  const fullUrl = normalize(url);
  const hostname = extractHostname(url);

  return (
    title.includes(k) ||
    fullUrl.includes(k) ||
    hostname.includes(k)
  );
}

function matchesManualRule(
  rule: CategoryRule,
  windowTitle?: string,
  url?: string
): boolean {
  const keywords = normalizeKeywords(rule.keywords);
  if (keywords.length === 0) return false;

  return keywords.some((kw) => matchesKeyword(kw, windowTitle, url));
}

export function autoCategory(
  appName: string,
  windowTitle?: string,
  url?: string
): Category {
  const rules = readRules();
  const appLower = normalize(appName);

  // 1. Manual rules first: specific override
  const manualRules = rules.filter(
    (r) => !r.isAutomatic && normalize(r.appName) === appLower
  );

  for (const rule of manualRules) {
    if (matchesManualRule(rule, windowTitle, url)) {
      return rule.category;
    }
  }

  // 2. Automatic rules second: app-level default
  const autoRule = rules.find(
    (r) => r.isAutomatic && normalize(r.appName) === appLower
  );

  if (autoRule) {
    return autoRule.category;
  }

  return 'Uncategorized';
}

export function listRules(): CategoryRule[] {
  return readRules();
}

// Rules CRUD
export function createRule(body: CreateCategoryRuleBody): CategoryRule {
  const rules = readRules();

  const rule: CategoryRule = {
    id: String(Date.now()),
    appName: body.appName.trim(),
    category: body.category,
    isAutomatic: body.isAutomatic,
    keywords: normalizeKeywords(body.keywords),
  };

  rules.push(rule);
  writeRules(rules);

  return rule;
}

export function updateRule(
  id: string,
  body: UpdateCategoryRuleBody
): CategoryRule | undefined {
  const rules = readRules();
  const rule = rules.find((r) => r.id === id);

  if (!rule) return undefined;

  if (body.category !== undefined) {
    rule.category = body.category;
  }

  if (body.isAutomatic !== undefined) {
    rule.isAutomatic = body.isAutomatic;
  }

  if (body.keywords !== undefined) {
    rule.keywords = normalizeKeywords(body.keywords);
  }

  writeRules(rules);
  return rule;
}

export function deleteRule(id: string): boolean {
  const rules = readRules();
  const nextRules = rules.filter((r) => r.id !== id);

  if (nextRules.length === rules.length) {
    return false;
  }

  writeRules(nextRules);
  return true;
}