/**
 * Keep in sync with backend insights payload — NOT the public DailyStats API shape.
 */
export type Category =
  | 'Work'
  | 'Study'
  | 'Entertainment'
  | 'Communication'
  | 'Utilities'
  | 'Uncategorized';

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

/** Public daily stats + fragmentation — same as backend InsightsLambdaStatsPayload */
export interface InsightsLambdaStatsPayload {
  date: string;
  categoryTotals: Record<Category, number>;
  totalTime: number;
  focusScore: number;
  contextSwitches: number;
  longestSession: number;
  topApps: { appName: string; category: Category; duration: number }[];
  sessionCount: number;
  appTransitionCount: number;
  shortFocusSessionCount: number;
  busiestWindow: BusiestSwitchWindow | null;
  focusSwitchSamples: FocusSwitchSample[];
}

export interface SessionTimelineEntry {
  startTime: string;
  startLocal: string;
  durationMinutes: number;
  appName: string;
  category: Category;
}

export interface InsightContent {
  type: 'pattern' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  icon: string;
}

export interface GenerateRequestBody {
  date: string;
  stats: InsightsLambdaStatsPayload;
  sessionTimeline?: SessionTimelineEntry[];
  comparison?: {
    yesterday?: InsightsLambdaStatsPayload;
  };
}
