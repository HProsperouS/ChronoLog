import { readCategories, writeCategories } from '../store/categories.store';
import type { CategoryDefinition } from '../types';

function normalizeName(value?: string): string {
  return (value ?? '').trim();
}

function normalizeColor(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

export function listCategories(): CategoryDefinition[] {
  return readCategories().sort((a, b) => a.name.localeCompare(b.name));
}

export function createCategory(name: string, color: string): CategoryDefinition {
  const normalizedName = normalizeName(name);
  const normalizedColor = normalizeColor(color);

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
  };

  categories.push(created);
  writeCategories(categories);

  return created;
}

export function updateCategory(name: string, color: string): CategoryDefinition | undefined {
  const normalizedName = normalizeName(name);
  const normalizedColor = normalizeColor(color);

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
  writeCategories(categories);

  return existing;
}