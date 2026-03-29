export type Category = string;
export type ProductivityType = 'productive' | 'non_productive' | 'neutral';

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
  excludeFromAnalytics?: boolean;
}

export interface CategoryRule {
  id: string;
  appName: string;
  category: Category;
  keywords?: string[];
  isAutomatic: boolean;
}

export type CategoryDefinition = {
  name: string;
  color: string;
  productivityType: ProductivityType;
};

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
  categoryTotals: Record<string, number>;
  totalTime: number;

  productiveMinutes: number;
  nonProductiveMinutes: number;
  neutralMinutes: number;

  focusScore: number;
  contextSwitches: number;
  productivitySwitches: number;

  longestSession: number;
  topApps: { appName: string; category: Category; duration: number }[];
}
