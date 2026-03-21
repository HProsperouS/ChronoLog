import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { timingSafeEqual } from 'crypto';
import OpenAI from 'openai';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import type { GenerateRequestBody, InsightContent } from './types';

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function safeEqualToken(expected: string, received: string): boolean {
  try {
    const e = Buffer.from(expected, 'utf8');
    const r = Buffer.from(received, 'utf8');
    if (e.length !== r.length) {
      // compare against dummy to reduce timing leak on length
      timingSafeEqual(e, e);
      return false;
    }
    return timingSafeEqual(e, r);
  } catch {
    return false;
  }
}

function extractBearer(headers: Record<string, string | undefined> | undefined): string | null {
  if (!headers) return null;
  const raw =
    headers.authorization ??
    headers.Authorization ??
    headers['Authorization'];
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function isDailyStats(x: unknown): x is GenerateRequestBody['stats'] {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.date === 'string' &&
    typeof o.totalTime === 'number' &&
    typeof o.focusScore === 'number' &&
    typeof o.contextSwitches === 'number' &&
    typeof o.longestSession === 'number' &&
    o.categoryTotals !== null &&
    typeof o.categoryTotals === 'object' &&
    Array.isArray(o.topApps)
  );
}

function normalizeInsights(raw: unknown): InsightContent[] {
  if (!raw || typeof raw !== 'object') return [];
  const insights = (raw as { insights?: unknown }).insights;
  if (!Array.isArray(insights)) return [];
  const out: InsightContent[] = [];
  for (const item of insights) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const type = o.type;
    if (type !== 'pattern' && type !== 'achievement' && type !== 'recommendation') continue;
    if (typeof o.title !== 'string' || typeof o.description !== 'string') continue;
    let icon = typeof o.icon === 'string' ? o.icon : 'Sparkles';
    const allowed = new Set([
      'TrendingDown',
      'TrendingUp',
      'Trophy',
      'AlertCircle',
      'Sparkles',
      'Target',
      'Shuffle',
    ]);
    if (!allowed.has(icon)) icon = 'Sparkles';
    out.push({
      type,
      title: o.title.slice(0, 120),
      description: o.description.slice(0, 2000),
      icon,
    });
  }
  return out.slice(0, 8);
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const proxySecret = process.env.PROXY_SECRET ?? '';
  const openAiKey = process.env.OPENAI_API_KEY ?? '';

  if (!proxySecret || !openAiKey) {
    return json(500, { error: 'Server misconfiguration' });
  }

  const token = extractBearer(event.headers);
  if (!token || !safeEqualToken(proxySecret, token)) {
    return json(401, { error: 'Unauthorized' });
  }

  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  if (event.requestContext.http.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body: GenerateRequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as GenerateRequestBody;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (!body.date || typeof body.date !== 'string' || !isDailyStats(body.stats)) {
    return json(400, { error: 'Expected { date: string, stats: DailyStats, comparison?: { yesterday } }' });
  }

  const client = new OpenAI({ apiKey: openAiKey });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: buildUserPrompt(body.stats, {
            comparison: body.comparison?.yesterday
              ? { yesterday: body.comparison.yesterday }
              : undefined,
          }),
        },
      ],
      max_tokens: 900,
      temperature: 0.55,
      response_format: { type: 'json_object' },
    });

    const rawText = completion.choices[0]?.message?.content ?? '{"insights":[]}';
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      return json(502, { error: 'Model returned invalid JSON' });
    }

    const insights = normalizeInsights(parsed);
    return json(200, { insights });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'OpenAI error';
    return json(503, { error: message });
  }
}
