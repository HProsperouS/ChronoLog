export type Category =
  | 'Work'
  | 'Study'
  | 'Entertainment'
  | 'Communication'
  | 'Utilities'
  | 'Uncategorized';

// Activity as used inside components (startTime/endTime are Date objects for easy formatting)
export interface Activity {
  id: number;
  appName: string;
  windowTitle?: string;
  url?: string;
  category: Category;
  duration: number;   // minutes
  startTime: Date;
  endTime: Date;
  date: string;       // YYYY-MM-DD
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
  date: string;
  created_at: string;
}

export interface DailyStats {
  date: string;
  categoryTotals: Record<Category, number>;
  totalTime: number;
  focusScore: number;
  contextSwitches: number;
  longestSession: number;
  topApps: { appName: string; category: Category; duration: number }[];
}
