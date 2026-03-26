const BUILT_IN_CATEGORY_COLORS: Record<string, string> = {
  Work: '#6366f1',
  Study: '#10b981',
  Entertainment: '#f59e0b',
  Communication: '#a855f7',
  Utilities: '#6b7280',
  Uncategorized: '#9ca3af',
  ChronoLog: '#1E3A8A',
};

const CATEGORY_COLOR_STORAGE_KEY = 'chronolog_category_colors';

function loadStoredCategoryColors(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(CATEGORY_COLOR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([k, v]) => typeof k === 'string' && typeof v === 'string'
      )
    );
  } catch {
    return {};
  }
}

function saveStoredCategoryColors(colors: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CATEGORY_COLOR_STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // ignore storage write failures
  }
}

export const categoryColors: Record<string, string> = {
  ...BUILT_IN_CATEGORY_COLORS,
  ...loadStoredCategoryColors(),
};

export function getCategoryColor(category: string): string {
  return categoryColors[category] ?? DEFAULT_CATEGORY_COLOR;
}

export function setCategoryColor(category: string, color: string): void {
  if (!category || !color) return;
  categoryColors[category] = color;

  const persisted = {
    ...loadStoredCategoryColors(),
    [category]: color,
  };

  saveStoredCategoryColors(persisted);
}

export const colors: Record<string, string> = {
  Purple: '#6366f1',
  Green: '#10b981',
  Orange: '#f59e0b',
  Magenta: '#a855f7',
  DarkGrey: '#6b7280',
  Grey: '#9ca3af',
  Blue: '#1E3A8A',
};


export const DEFAULT_CATEGORY_COLOR = '#9ca3af';