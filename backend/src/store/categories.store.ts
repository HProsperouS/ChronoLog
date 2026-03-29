import fs from 'fs';
import path from 'path';

import type { CategoryDefinition, ProductivityType } from '../types';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');

const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { name: 'Deep Work', color: '#6366f1', productivityType: 'productive' },
  { name: 'Study', color: '#10b981', productivityType: 'productive' },
  { name: 'Communication', color: '#a855f7', productivityType: 'neutral' },
  { name: 'Meetings', color: '#06b6d4', productivityType: 'productive' },
  { name: 'Admin', color: '#64748b', productivityType: 'productive' },
  { name: 'Entertainment', color: '#f59e0b', productivityType: 'non_productive' },
  { name: 'Gaming', color: '#ef4444', productivityType: 'non_productive' },
  { name: 'Uncategorized', color: '#94a3b8', productivityType: 'neutral' },
  { name: 'ChronoLog', color: '#1d4ed8', productivityType: 'neutral' },
];

const DEFAULT_CATEGORY_MAP = new Map(
  DEFAULT_CATEGORIES.map((category) => [category.name.toLowerCase(), category]),
);

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function defaultProductivityTypeForCategory(name: string): ProductivityType {
  return DEFAULT_CATEGORY_MAP.get(name.toLowerCase())?.productivityType ?? 'neutral';
}

function defaultColorForCategory(name: string): string {
  return DEFAULT_CATEGORY_MAP.get(name.toLowerCase())?.color ?? '#8b5cf6';
}

function normalizeProductivityType(
  value: unknown,
  categoryName: string,
): ProductivityType {
  if (value === 'productive' || value === 'non_productive' || value === 'neutral') {
    return value;
  }
  return defaultProductivityTypeForCategory(categoryName);
}

function normalizeCategoryDefinition(value: unknown): CategoryDefinition | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const colorRaw = typeof value.color === 'string' ? value.color.trim().toLowerCase() : '';

  if (!name) return null;

  return {
    name,
    color: colorRaw || defaultColorForCategory(name),
    productivityType: normalizeProductivityType(value.productivityType, name),
  };
}

function mergeWithDefaultCategories(categories: CategoryDefinition[]): CategoryDefinition[] {
  const merged = new Map<string, CategoryDefinition>();

  for (const defaultCategory of DEFAULT_CATEGORIES) {
    merged.set(defaultCategory.name.toLowerCase(), defaultCategory);
  }

  for (const category of categories) {
    merged.set(category.name.toLowerCase(), category);
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function readCategories(): CategoryDefinition[] {
  ensureDir();

  if (!fs.existsSync(CATEGORIES_FILE)) {
    atomicWrite(CATEGORIES_FILE, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8')) as unknown;

    if (!Array.isArray(raw)) {
      atomicWrite(CATEGORIES_FILE, DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }

    const normalized = raw
      .map(normalizeCategoryDefinition)
      .filter((category): category is CategoryDefinition => category !== null);

    const merged = mergeWithDefaultCategories(normalized);

    // Self-heal older files so built-ins are persisted going forward.
    atomicWrite(CATEGORIES_FILE, merged);

    return merged;
  } catch {
    atomicWrite(CATEGORIES_FILE, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
}

export function writeCategories(categories: CategoryDefinition[]): void {
  ensureDir();
  atomicWrite(CATEGORIES_FILE, mergeWithDefaultCategories(categories));
}