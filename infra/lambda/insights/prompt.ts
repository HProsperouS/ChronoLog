import type { InsightsLambdaStatsPayload, SessionTimelineEntry } from './types';

function formatFragmentation(stats: InsightsLambdaStatsPayload): string[] {
  const lines = [
    `  Sessions recorded: ${stats.sessionCount}`,
    `  App or category switches (adjacent sessions): ${stats.appTransitionCount}`,
    `  Short focus sessions (<3 min Work/Study): ${stats.shortFocusSessionCount}`,
    `  Focus-leaving context switches (dashboard metric): ${stats.contextSwitches}`,
  ];
  if (stats.busiestWindow && stats.busiestWindow.transitionCount > 0) {
    lines.push(
      `  Busiest switching window (local): ${stats.busiestWindow.windowStartLocal}–${stats.busiestWindow.windowEndLocal} with ${stats.busiestWindow.transitionCount} switches`,
    );
  } else {
    lines.push('  Busiest switching window: none');
  }
  if (stats.focusSwitchSamples?.length) {
    lines.push('  Sample switches (local time):');
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

export function buildSystemPrompt(): string {
  return `You are a concise productivity coach for a desktop screen-time tracker.

Language: English only for titles and descriptions.

Rules:
- Base claims on the provided aggregates AND the session log when present.
- For time-of-day stories (e.g. "morning", "10:00–12:00"), use only times that appear in the session log or in the busiest-window / sample-switch lines. Do not invent clock times.
- Distinguish: (1) app/category switches = hopping between apps or categories; (2) focus-leaving context switches = dashboard metric (leaving Work/Study).
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
