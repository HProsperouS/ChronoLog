import { readInsights, writeInsights } from '../store/config.store';
import type { DailyStats, Insight } from '../types';

function getInsightsUrl(): string {
  const url = process.env.INSIGHTS_FUNCTION_URL?.trim();
  if (!url) throw new Error('INSIGHTS_FUNCTION_URL is not set (Lambda Function URL)');
  return url.replace(/\/$/, '');
}

function getProxySecret(): string {
  const secret = process.env.INSIGHTS_PROXY_SECRET?.trim();
  if (!secret) throw new Error('INSIGHTS_PROXY_SECRET is not set (same value as CDK ProxySecret)');
  return secret;
}

function isInsightShape(x: unknown): x is Omit<Insight, 'id' | 'date' | 'created_at'> {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const t = o.type;
  if (t !== 'pattern' && t !== 'achievement' && t !== 'recommendation') return false;
  return typeof o.title === 'string' && typeof o.description === 'string' && typeof o.icon === 'string';
}

/**
 * Calls the hosted Lambda (Function URL), merges results into insights.json.
 * OpenAI is only invoked inside AWS — not from this process.
 */
export async function generateInsights(stats: DailyStats): Promise<Insight[]> {
  const url = getInsightsUrl();
  const secret = getProxySecret();
  const date = stats.date;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ date, stats }),
  });

  const rawText = await res.text();
  let body: unknown;
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Insights proxy returned non-JSON (${res.status})`);
  }

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : rawText.slice(0, 200);
    throw new Error(`Insights proxy ${res.status}: ${msg}`);
  }

  if (!body || typeof body !== 'object' || !('insights' in body)) {
    throw new Error('Insights proxy response missing "insights" array');
  }

  const items = (body as { insights: unknown }).insights;
  if (!Array.isArray(items)) throw new Error('Insights proxy "insights" is not an array');

  const now = new Date().toISOString();
  const newInsights: Insight[] = [];
  let i = 0;
  for (const item of items) {
    if (!isInsightShape(item)) continue;
    newInsights.push({
      id: `${date}-${i}`,
      type: item.type,
      title: item.title,
      description: item.description,
      icon: item.icon,
      date,
      created_at: now,
    });
    i++;
  }

  if (newInsights.length === 0) {
    throw new Error('Insights proxy returned no valid insight items');
  }

  const existing = readInsights().filter((ins) => ins.date !== date);
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
