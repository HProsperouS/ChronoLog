export type Category =
  | 'Work'
  | 'Study'
  | 'Entertainment'
  | 'Communication'
  | 'Utilities'
  | 'Uncategorized'
  | 'ChronoLog';

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
  excludeFromAnalytics?: boolean;
}

export interface CategoryRule {
  id: string;
  appName: string;
  category: Category;
  isAutomatic: boolean;
  keywords?: string[];
}

export type CategoryDefinition = {
  name: string;
  color: string;
};

export interface Insight {
  id: string;
  type: 'pattern' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  icon: string;
  date: string;       // YYYY-MM-DD
  created_at: string;
}

/** Local 30-min bucket with the most app/category switches */
export interface BusiestSwitchWindow {
  windowStartLocal: string;
  windowEndLocal: string;
  transitionCount: number;
}

export interface FocusSwitchSample {
  timeLocal: string;
  fromApp: string;
  toApp: string;
  fromCategory: Category;
  toCategory: Category;
}

/** Sent to insights Lambda only — no windowTitle/url */
export interface SessionTimelineEntry {
  startTime: string;
  startLocal: string;
  durationMinutes: number;
  appName: string;
  category: Category;
}

/** Returned by `/api/stats/*` — stable public shape */
export interface DailyStats {
  date: string;
  categoryTotals: Record<Category, number>;  // minutes per category
  totalTime: number;
  focusScore: number;                        // 0-100
  contextSwitches: number;
  longestSession: number;                    // minutes (longest single activity row)
  topApps: { appName: string; category: Category; duration: number }[];
}

/** Extra fields computed only for `POST` to the insights Lambda */
export interface InsightFragmentationMetrics {
  sessionCount: number;
  appTransitionCount: number;
  shortFocusSessionCount: number;
  busiestWindow: BusiestSwitchWindow | null;
  focusSwitchSamples: FocusSwitchSample[];
}

export type InsightsLambdaStatsPayload = DailyStats & InsightFragmentationMetrics;

export interface Settings {
  trackingEnabled:      boolean;
  idleDetectionEnabled: boolean;
  notificationsEnabled: boolean;
  launchAtStartup:      boolean;
  runInBackground:      boolean;
  pollIntervalSeconds:  number;
  idleThresholdMinutes: number;
  /** Days of activity data to keep (90 = 3 months, 0 = never auto-delete). */
  retentionDays:        number;
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
  excludeFromAnalytics?: boolean;
}

export interface CreateCategoryRuleBody {
  appName: string;
  category: Category;
  isAutomatic: boolean;
  keywords?: string[];
}

export interface UpdateCategoryRuleBody {
  category?: Category;
  isAutomatic?: boolean;
  keywords?: string[];
}
