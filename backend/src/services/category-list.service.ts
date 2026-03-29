import { readCategories, writeCategories } from '../store/categories.store';
import type { CategoryDefinition } from '../types';
import { listRules } from './category.service';

function normalizeName(value?: string): string {
  return (value ?? '').trim();
}

function normalizeColor(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeProductivityType(
  value?: string,
): 'productive' | 'non_productive' | 'neutral' {
  if (value === 'productive' || value === 'non_productive' || value === 'neutral') {
    return value;
  }
  return 'neutral';
}

export function listCategories(): CategoryDefinition[] {
  return readCategories().sort((a, b) => a.name.localeCompare(b.name));
}

export function createCategory(
  name: string,
  color: string,
  productivityType?: string,
): CategoryDefinition {
  const normalizedName = normalizeName(name);
  const normalizedColor = normalizeColor(color);
  const normalizedProductivityType = normalizeProductivityType(productivityType);

  if (!normalizedName) {
    throw new Error('Category name is required.');
  }

  if (!normalizedColor) {
    throw new Error('Category color is required.');
  }

  const categories = readCategories();

  const exists = categories.some(
    (c) => c.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (exists) {
    throw new Error('Category already exists.');
  }

  const created: CategoryDefinition = {
    name: normalizedName,
    color: normalizedColor,
    productivityType: normalizedProductivityType,
  };

  categories.push(created);
  writeCategories(categories);

  return created;
}

export function updateCategory(
  name: string,
  color: string,
  productivityType?: string,
): CategoryDefinition | undefined {
  const normalizedName = normalizeName(name);
  const normalizedColor = normalizeColor(color);
  const normalizedProductivityType = normalizeProductivityType(productivityType);

  if (!normalizedName || !normalizedColor) {
    return undefined;
  }

  const categories = readCategories();
  const existing = categories.find(
    (c) => c.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (!existing) {
    return undefined;
  }

  existing.color = normalizedColor;
  existing.productivityType = normalizedProductivityType;
  writeCategories(categories);

  return existing;
}

export function deleteCategory(name: string): boolean {
  const normalizedName = normalizeName(name);

  if (!normalizedName) {
    return false;
  }

  const categories = readCategories();
  const existing = categories.find(
    (c) => c.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (!existing) {
    return false;
  }

  const rulesUsingCategory = listRules().filter(
    (rule) => rule.category.toLowerCase() === normalizedName.toLowerCase()
  );

  if (rulesUsingCategory.length > 0) {
    throw new Error(
      `Cannot delete category because it is still used by ${rulesUsingCategory.length} rule${rulesUsingCategory.length === 1 ? '' : 's'}.`
    );
  }

  const nextCategories = categories.filter(
    (c) => c.name.toLowerCase() !== normalizedName.toLowerCase()
  );

  writeCategories(nextCategories);
  return true;
}