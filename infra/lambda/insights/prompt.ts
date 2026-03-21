import type { DailyStats } from './types';

/**
 * How to evolve prompts
 * ---------------------
 * 1. **System** = role + output contract + safety. Change rarely.
 * 2. **User** = data + task. Add fields when you send more stats (e.g. weekly averages).
 * 3. Insights are **English only** — no locale switching.
 * 4. Test with real payloads from ChronoLog export / dev backend before tightening temperature.
 */

function formatStatsBlock(label: string, stats: DailyStats): string {
  const lines = [
    `${label}`,
    `  Date: ${stats.date}`,
    `  Focus score (0-100): ${stats.focusScore}`,
    `  Total tracked time: ${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`,
    `  Context switches: ${stats.contextSwitches}`,
    `  Longest focus block: ${stats.longestSession} minutes`,
    `  Category minutes:`,
    ...Object.entries(stats.categoryTotals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `    ${k}: ${Math.floor(v / 60)}h ${v % 60}m`),
    `  Top apps: ${stats.topApps.map((a) => `${a.appName} (${a.duration}m, ${a.category})`).join(', ') || 'none'}`,
  ];
  return lines.join('\n');
}

/** English-only coach prompt + JSON contract. */
export function buildSystemPrompt(): string {
  return `You are a concise productivity coach for a desktop screen-time tracker.

Language:
- Write every insight title and description in English only.

Rules:
- Base every claim on the numbers provided. Do not invent apps, times, or scores.
- If total tracked time is zero or negligible, say data is insufficient and suggest tracking longer — still return 1 short insight.
- Tone: supportive, specific, not preachy.
- Do not mention that you are an AI.

Output format (critical):
- Respond with ONE JSON object only (no markdown fences).
- Shape: {"insights":[...]} where insights has 3 to 5 items.
- Each item:
  - type: exactly one of "pattern" | "achievement" | "recommendation"
  - title: max 8 words
  - description: 2-3 short sentences; cite concrete numbers from the data
  - icon: one of TrendingDown | TrendingUp | Trophy | AlertCircle | Sparkles | Target | Shuffle`;
}

export function buildUserPrompt(
  stats: DailyStats,
  options?: { comparison?: { yesterday?: DailyStats } },
): string {
  const parts = [
    'Analyze the following usage summary and produce insights as specified.',
    '',
    formatStatsBlock('Primary day (focus of analysis)', stats),
  ];

  const y = options?.comparison?.yesterday;
  if (y) {
    parts.push('', formatStatsBlock('Previous day (for day-over-day comparison)', y));
    parts.push(
      '',
      'Compare the primary day to the previous day where helpful (focus score, switches, category shifts).',
    );
  }

  return parts.join('\n');
}
