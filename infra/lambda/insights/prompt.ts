import type { InsightsLambdaStatsPayload, SessionTimelineEntry } from './types';

function formatFragmentation(stats: InsightsLambdaStatsPayload): string[] {
  const lines = [
    `  Context switches (SAME as Dashboard / Insights page — authoritative): ${stats.contextSwitches}`,
    `    Definition: productive ↔ non-productive flips across the full timeline (productive = Work/Study; non-productive = any other category). Very short (<1 min) blips may be merged to reduce noise. Treat this number as authoritative; do not recompute it from raw categories here.`,
    `  App/category hops (adjacent sessions, ANY change — NOT the dashboard "context switches" number): ${stats.appTransitionCount}`,
    `  Sessions recorded: ${stats.sessionCount}`,
    `  Short focus sessions (<3 min Work/Study): ${stats.shortFocusSessionCount}`,
  ];
  if (stats.busiestWindow && stats.busiestWindow.transitionCount > 0) {
    lines.push(
      `  Busiest app/category hop window (local, 30 min — counts app/category transitions, not contextSwitches): ${stats.busiestWindow.windowStartLocal}–${stats.busiestWindow.windowEndLocal} with ${stats.busiestWindow.transitionCount} hops`,
    );
  } else {
    lines.push('  Busiest switching window: none');
  }
  if (stats.focusSwitchSamples?.length) {
    lines.push('  Sample app/category hops (local time — same basis as appTransitionCount, not contextSwitches):');
    for (const s of stats.focusSwitchSamples) {
      lines.push(
        `    ${s.timeLocal}: ${s.fromApp} (${s.fromCategory}) → ${s.toApp} (${s.toCategory})`,
      );
    }
  }
  return lines;
}

function formatStatsBlock(label: string, stats: InsightsLambdaStatsPayload): string {
  const lines = [
    `${label}`,
    `  Date: ${stats.date}`,
    `  Focus score (0-100): ${stats.focusScore}`,
    `  Total tracked time: ${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`,
    `  Longest single session row: ${stats.longestSession} minutes`,
    `  Category minutes:`,
    ...Object.entries(stats.categoryTotals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `    ${k}: ${Math.floor(v / 60)}h ${v % 60}m`),
    `  Top apps: ${stats.topApps.map((a) => `${a.appName} (${a.duration}m, ${a.category})`).join(', ') || 'none'}`,
    `  Fragmentation & switching:`,
    ...formatFragmentation(stats),
  ];
  return lines.join('\n');
}

function formatSessionTimeline(rows: SessionTimelineEntry[]): string {
  const lines = [
    'Chronological session log (local start HH:mm, duration minutes, app, category). Window titles and URLs were not sent.',
    ...rows.map(
      (r) => `  ${r.startLocal}  +${r.durationMinutes}m  ${r.appName}  [${r.category}]`,
    ),
  ];
  return lines.join('\n');
}

function formatWeeklyStatsBlock(
  label: string,
  stats: {
    totalTime: number;
    avgFocusScore: number;
    contextSwitches: number;
    longestSession: number;
    categoryTotals: Record<string, number>;
    topApps: { appName: string; category: string; duration: number }[];
  },
): string {
  const lines = [
    `${label}`,
    `  Average focus score: ${stats.avgFocusScore}/100`,
    `  Total tracked time: ${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`,
    `  Longest session: ${stats.longestSession} minutes`,
    `  Total context switches: ${stats.contextSwitches}`,
    `  Category breakdown (minutes):`,
    ...Object.entries(stats.categoryTotals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `    ${k}: ${Math.floor(v / 60)}h ${v % 60}m`),
    `  Top apps: ${stats.topApps.map((a) => `${a.appName} (${a.duration}m, ${a.category})`).join(', ') || 'none'}`,
  ];
  return lines.join('\n');
}

export function buildSystemPrompt(): string {
  return `You are a concise productivity coach for a desktop screen-time tracker.

Language: English only for titles and descriptions.

Rules:
- Base claims on the provided aggregates AND the session log when present.
- For time-of-day stories (e.g. "morning", "10:00–12:00"), use only times that appear in the session log or in the busiest-window / sample-hop lines. Do not invent clock times.
- CONSISTENCY: The field "contextSwitches" is identical to the in-app "Context Switches" / focus-score input. When you mention "context switches" in relation to user goals (e.g. staying under 20), cite ONLY contextSwitches. Never label appTransitionCount or timeline hops as "context switches".
- appTransitionCount and the session log describe app/category hopping and fragmentation; use different wording (e.g. "switched apps often", "fragmented blocks") so it is not confused with contextSwitches.
- Categories may be user-defined. Do not assume a fixed set of category names; use the labels provided.
- If data is very sparse, say so briefly — still return at least 1 insight.
- Tone: supportive, specific, not preachy. Do not say you are an AI.

Output: ONE JSON object, shape {"insights":[...]} with 3-5 items.
Each item: type pattern|achievement|recommendation; title max 8 words; description 2-3 sentences with numbers; icon one of TrendingDown|TrendingUp|Trophy|AlertCircle|Sparkles|Target|Shuffle`;
}

export function buildUserPrompt(
  stats: InsightsLambdaStatsPayload,
  options?: {
    comparison?: { yesterday?: InsightsLambdaStatsPayload };
    sessionTimeline?: SessionTimelineEntry[];
  },
): string {
  const parts = [
    'Analyze the following data. When the session log is present, use it to describe periods of fragmentation or sustained focus with specific local times.',
    '',
    formatStatsBlock('Primary day', stats),
  ];

  if (options?.sessionTimeline?.length) {
    parts.push('', formatSessionTimeline(options.sessionTimeline));
  }

  const y = options?.comparison?.yesterday;
  if (y) {
    parts.push('', formatStatsBlock('Previous day (comparison)', y));
    parts.push(
      '',
      'Compare days where useful (focus score, switch counts, busiest windows, time patterns).',
    );
  }

  return parts.join('\n');
}

export function buildWeeklySystemPrompt(): string {
  return `You are a weekly productivity coach analyzing a week of screen-time tracking data.

Language: English only for titles and descriptions.

Rules:
- Focus on **trends, patterns, and consistency** across the 7-day week.
- Highlight high/low focus scores and day-to-day variation.
- Look for weekly habits: Which days are most/least productive? Are there patterns by day-of-week?
- Categories are user-defined. Do not assume a fixed set; use the labels provided.
- Provide 1–2 actionable recommendations for the coming week based on the patterns observed.
- Tone: supportive, encouraging, specific to their habits. Do not say you are an AI.

Output: ONE JSON object, shape {"insights":[...]} with 3-5 items.
Each item: type pattern|achievement|recommendation; title max 8 words; description 2-3 sentences with numbers; icon one of TrendingDown|TrendingUp|Trophy|AlertCircle|Sparkles|Target|Shuffle`;
}

export function buildWeeklyUserPrompt(
  aggregated: {
    totalTime: number;
    avgFocusScore: number;
    contextSwitches: number;
    longestSession: number;
    categoryTotals: Record<string, number>;
    topApps: { appName: string; category: string; duration: number }[];
  },
  dailyStats: Array<{
    date: string;
    focusScore: number;
    totalTime: number;
    contextSwitches: number;
    categoryTotals: Record<string, number>;
  }>,
): string {
  const parts = [
    'Analyze this week of productivity data:',
    '',
    formatWeeklyStatsBlock('Weekly Aggregate', aggregated),
  ];

  parts.push('', 'Day-by-day breakdown:');
  for (const day of dailyStats) {
    const dayName = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    parts.push(
      `  ${dayName} (${day.date}): Focus ${day.focusScore}/100, ${Math.floor(day.totalTime / 60)}h ${day.totalTime % 60}m tracked, ${day.contextSwitches} context switches`,
    );
  }

  parts.push(
    '',
    'Identify trends: Which days had highest/lowest focus? Were there consistent times of day with better productivity? How did context switching vary? Suggest 1–2 concrete improvements for next week.',
  );

  return parts.join('\n');
}
