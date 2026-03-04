import OpenAI from 'openai';
import { readInsights, writeInsights } from '../store/config.store';
import type { DailyStats, Insight } from '../types';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    client = new OpenAI({ apiKey });
  }
  return client;
}

function formatStats(stats: DailyStats): string {
  const lines = [
    `Date: ${stats.date}`,
    `Focus Score: ${stats.focusScore}%`,
    `Total Time: ${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`,
    `Context Switches: ${stats.contextSwitches}`,
    `Longest Session: ${stats.longestSession} minutes`,
    `Category Breakdown:`,
    ...Object.entries(stats.categoryTotals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `  ${k}: ${Math.floor(v / 60)}h ${v % 60}m`),
    `Top Apps: ${stats.topApps.map((a) => `${a.appName} (${a.duration}m)`).join(', ')}`,
  ];
  return lines.join('\n');
}

export async function generateInsights(stats: DailyStats): Promise<Insight[]> {
  const openai = getClient();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a productivity analyst. Analyze the user's computer usage data and return a JSON array of insights.
Each insight must have:
- type: "pattern" | "achievement" | "recommendation"
- title: short title (max 8 words)
- description: 2-3 sentences with specific data references
- icon: one of TrendingDown | TrendingUp | Trophy | AlertCircle | Shuffle | Target | Sparkles

Return ONLY a valid JSON array, no markdown, no explanation.`,
      },
      {
        role: 'user',
        content: `Analyze this usage data and generate 3-5 insights:\n\n${formatStats(stats)}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{"insights":[]}';
  const parsed = JSON.parse(raw) as { insights?: Omit<Insight, 'id' | 'date' | 'created_at'>[] };
  const items = parsed.insights ?? [];

  const now = new Date().toISOString();
  const newInsights: Insight[] = items.map((item, i) => ({
    id: `${stats.date}-${i}`,
    type: item.type,
    title: item.title,
    description: item.description,
    icon: item.icon,
    date: stats.date,
    created_at: now,
  }));

  const existing = readInsights().filter((ins) => ins.date !== stats.date);
  writeInsights([...existing, ...newInsights]);

  return newInsights;
}

export function getInsights(date?: string): Insight[] {
  const all = readInsights();
  if (!date) return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return all
    .filter((ins) => ins.date === date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
