export type Category =
  | 'Work'
  | 'Study'
  | 'Entertainment'
  | 'Communication'
  | 'Utilities'
  | 'Uncategorized';

export interface Activity {
  id: number;
  appName: string;
  windowTitle?: string;
  url?: string;
  category: Category;
  duration: number;   // minutes
  startTime: string;  // ISO string
  endTime: string;    // ISO string
  date: string;       // YYYY-MM-DD  for file indexing
}

export interface CategoryRule {
  id: string;
  appName: string;
  category: Category;
  keywords?: string[];
  isAutomatic: boolean;
}

export interface Insight {
  id: string;
  type: 'pattern' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  icon: string;
  date: string;       // YYYY-MM-DD
  created_at: string;
}

export interface DailyStats {
  date: string;
  categoryTotals: Record<Category, number>;  // minutes per category
  totalTime: number;
  focusScore: number;                        // 0-100
  contextSwitches: number;
  longestSession: number;                    // minutes
  topApps: { appName: string; category: Category; duration: number }[];
}

export interface Settings {
  pollIntervalSeconds: number;
  idleThresholdMinutes: number;
}

// ─── Request body types ───────────────────────────────────────────────────────

export interface CreateActivityBody {
  appName: string;
  windowTitle?: string;
  url?: string;
  category?: Category;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface CreateCategoryRuleBody {
  appName: string;
  category: Category;
  keywords?: string[];
  isAutomatic: boolean;
}

export interface UpdateCategoryRuleBody {
  category?: Category;
  keywords?: string[];
  isAutomatic?: boolean;
}
