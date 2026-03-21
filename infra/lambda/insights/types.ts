/**
 * Mirror of backend DailyStats — keep in sync with backend/src/types/index.ts
 */
export type Category =
  | 'Work'
  | 'Study'
  | 'Entertainment'
  | 'Communication'
  | 'Utilities'
  | 'Uncategorized';

export interface DailyStats {
  date: string;
  categoryTotals: Record<Category, number>;
  totalTime: number;
  focusScore: number;
  contextSwitches: number;
  longestSession: number;
  topApps: { appName: string; category: Category; duration: number }[];
}

/** Raw items from the model before local ids are applied */
export interface InsightContent {
  type: 'pattern' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  icon: string;
}

export interface GenerateRequestBody {
  date: string;
  stats: DailyStats;
  /** Optional second day for comparison in the prompt */
  comparison?: {
    yesterday?: DailyStats;
  };
}
