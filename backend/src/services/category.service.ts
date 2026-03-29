import { readRules, writeRules } from '../store/category-rules.store';
import type {
  Category,
  CategoryRule,
  CreateCategoryRuleBody,
  UpdateCategoryRuleBody,
  RuleCondition,
  RuleConditionField,
  RuleMatchMode,
} from '../types';

function normalize(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeKeywords(values?: string[]): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

function normalizeMatchMode(value?: string): RuleMatchMode {
  return value === 'all' ? 'all' : 'any';
}

function normalizeConditionField(value?: string): RuleConditionField | null {
  if (value === 'windowTitle' || value === 'url' || value === 'hostname') {
    return value;
  }
  return null;
}

function normalizeConditions(values?: RuleCondition[]): RuleCondition[] {
  return (values ?? [])
    .map((condition) => {
      const field = normalizeConditionField(condition?.field);
      const value = (condition?.value ?? '').trim();
      const operator = condition?.operator === 'contains' ? 'contains' : null;

      if (!field || !operator || !value) return null;

      return {
        field,
        operator,
        value,
      } as RuleCondition;
    })
    .filter((condition): condition is RuleCondition => condition !== null);
}

function extractHostname(rawUrl?: string): string {
  if (!rawUrl) return '';

  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function getFieldValue(
  field: RuleConditionField,
  windowTitle?: string,
  url?: string
): string {
  if (field === 'windowTitle') return normalize(windowTitle);
  if (field === 'url') return normalize(url);
  return extractHostname(url);
}

function matchesCondition(
  condition: RuleCondition,
  windowTitle?: string,
  url?: string
): boolean {
  const value = normalize(condition.value);
  if (!value) return false;

  const fieldValue = getFieldValue(condition.field, windowTitle, url);

  if (condition.operator === 'contains') {
    return fieldValue.includes(value);
  }

  return false;
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


function getManualRulePriority(rule: CategoryRule): { tier: number; specificity: number } {
  const conditions = normalizeConditions(rule.conditions);

  if (conditions.length > 0) {
    const matchMode = normalizeMatchMode(rule.matchMode);

    return {
      tier: matchMode === 'all' ? 3 : 2,
      specificity: conditions.length,
    };
  }

  const keywords = normalizeKeywords(rule.keywords);
  if (keywords.length > 0) {
    return {
      tier: 1,
      specificity: keywords.length,
    };
  }

  return {
    tier: 0,
    specificity: 0,
  };
}

function matchesManualRule(
  rule: CategoryRule,
  windowTitle?: string,
  url?: string
): boolean {
  const conditions = normalizeConditions(rule.conditions);

  if (conditions.length > 0) {
    const matchMode = normalizeMatchMode(rule.matchMode);

    return matchMode === 'all'
      ? conditions.every((condition) => matchesCondition(condition, windowTitle, url))
      : conditions.some((condition) => matchesCondition(condition, windowTitle, url));
  }

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
  const manualRules = rules
    .filter((r) => !r.isAutomatic && normalize(r.appName) === appLower)
    .sort((a, b) => {
      const aPriority = getManualRulePriority(a);
      const bPriority = getManualRulePriority(b);

      if (bPriority.tier !== aPriority.tier) {
        return bPriority.tier - aPriority.tier;
      }

      if (bPriority.specificity !== aPriority.specificity) {
        return bPriority.specificity - aPriority.specificity;
      }

      return 0;
    });

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

export function createRule(body: CreateCategoryRuleBody): CategoryRule {
  const rules = readRules();

  const rule: CategoryRule = {
    id: String(Date.now()),
    appName: body.appName.trim(),
    category: body.category,
    isAutomatic: body.isAutomatic,
    keywords: normalizeKeywords(body.keywords),
    matchMode: normalizeMatchMode(body.matchMode),
    conditions: normalizeConditions(body.conditions),
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

  if (body.matchMode !== undefined) {
    rule.matchMode = normalizeMatchMode(body.matchMode);
  }

  if (body.conditions !== undefined) {
    rule.conditions = normalizeConditions(body.conditions);
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