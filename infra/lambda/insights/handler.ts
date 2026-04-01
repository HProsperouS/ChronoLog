import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { timingSafeEqual } from 'crypto';
import OpenAI from 'openai';
import {
  buildSeedAppsSystemPrompt,
  buildSeedAppsUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  buildWeeklySystemPrompt,
  buildWeeklyUserPrompt,
} from './prompt';
import type {
  Category,
  GenerateRequestBody,
  InsightContent,
  SeedAppsRequestBody,
  SeedAppsResponseBody,
  SeedAppInput,
  SessionTimelineEntry,
} from './types';

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

function isCategory(x: unknown): x is Category {
  return typeof x === 'string' && x.trim().length > 0;
}

function normalizeCategory(value: unknown, allowed: Set<string>, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return allowed.has(trimmed) ? trimmed : fallback;
}

function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseSeedAppsBody(raw: unknown): SeedAppsRequestBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.mode !== 'seedApps') return null;
  if (!Array.isArray(o.apps) || !Array.isArray(o.allowedCategories)) return null;

  const allowedCategories = (o.allowedCategories as unknown[])
    .filter((c) => typeof c === 'string' && c.trim().length > 0)
    .map((c) => (c as string).trim());

  const apps: SeedAppInput[] = [];
  for (const row of o.apps as unknown[]) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.appName !== 'string' || r.appName.trim().length === 0) continue;
    apps.push({
      appName: r.appName.trim().slice(0, 120),
      executablePath: typeof r.executablePath === 'string' ? r.executablePath.slice(0, 500) : undefined,
      installLocation: typeof r.installLocation === 'string' ? r.installLocation.slice(0, 500) : undefined,
      source: typeof r.source === 'string' ? r.source.slice(0, 60) : undefined,
    });
  }

  if (allowedCategories.length === 0 || apps.length === 0) return null;
  return { mode: 'seedApps', allowedCategories, apps };
}

function normalizeSeedAppsResponse(
  raw: unknown,
  allowedCategories: string[]
): SeedAppsResponseBody {
  const allowed = new Set(allowedCategories);
  const fallback =
    allowed.has('Uncategorized')
      ? 'Uncategorized'
      : allowedCategories[0];

  if (!raw || typeof raw !== 'object') return { mappings: [] };
  const mappingsRaw = (raw as { mappings?: unknown }).mappings;
  if (!Array.isArray(mappingsRaw)) return { mappings: [] };

  const seen = new Set<string>();
  const out: SeedAppsResponseBody['mappings'] = [];
  for (const item of mappingsRaw) {
    if (!item || typeof item !== 'object') continue;
    const m = item as Record<string, unknown>;
    const appName = typeof m.appName === 'string' ? m.appName.trim() : '';
    if (!appName || seen.has(appName)) continue;
    seen.add(appName);
    out.push({
      appName: appName.slice(0, 120),
      category: normalizeCategory(m.category, allowed, fallback),
      confidence: normalizeConfidence(m.confidence),
    });
  }

  return { mappings: out.slice(0, 600) };
}

function isBusiestWindowVal(x: unknown): boolean {
  if (x === null) return true;
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.windowStartLocal === 'string' &&
    typeof o.windowEndLocal === 'string' &&
    typeof o.transitionCount === 'number'
  );
}

function isFocusSwitchSampleRow(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.timeLocal === 'string' &&
    typeof o.fromApp === 'string' &&
    typeof o.toApp === 'string' &&
    isCategory(o.fromCategory) &&
    isCategory(o.toCategory)
  );
}

function isInsightsLambdaStatsPayload(x: unknown): x is GenerateRequestBody['stats'] {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.date !== 'string' ||
    typeof o.totalTime !== 'number' ||
    typeof o.focusScore !== 'number' ||
    typeof o.contextSwitches !== 'number' ||
    typeof o.longestSession !== 'number' ||
    o.categoryTotals === null ||
    typeof o.categoryTotals !== 'object' ||
    !Array.isArray(o.topApps) ||
    typeof o.sessionCount !== 'number' ||
    typeof o.appTransitionCount !== 'number' ||
    typeof o.shortFocusSessionCount !== 'number' ||
    !isBusiestWindowVal(o.busiestWindow) ||
    !Array.isArray(o.focusSwitchSamples)
  ) {
    return false;
  }
  return (o.focusSwitchSamples as unknown[]).every(isFocusSwitchSampleRow);
}

function parseSessionTimeline(raw: unknown): SessionTimelineEntry[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: SessionTimelineEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    if (
      typeof o.startTime !== 'string' ||
      typeof o.startLocal !== 'string' ||
      typeof o.durationMinutes !== 'number' ||
      typeof o.appName !== 'string' ||
      !isCategory(o.category)
    ) {
      continue;
    }
    out.push({
      startTime: o.startTime,
      startLocal: o.startLocal,
      durationMinutes: o.durationMinutes,
      appName: o.appName,
      category: o.category,
    });
  }
  return out.length > 0 ? out : undefined;
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

  const mode = body.mode ?? 'daily';

  if (mode === 'daily') {
    return handleDailyInsights(body, openAiKey);
  } else if (mode === 'weekly') {
    return handleWeeklyInsights(body, openAiKey);
  } else if (mode === 'seedApps') {
    return handleSeedApps(body, openAiKey);
  } else {
    return json(400, { error: 'Invalid mode (expected "daily", "weekly", or "seedApps")' });
  }
}

async function handleDailyInsights(body: GenerateRequestBody, openAiKey: string): Promise<APIGatewayProxyResultV2> {
  if (!body.date || typeof body.date !== 'string' || !isInsightsLambdaStatsPayload(body.stats)) {
    return json(400, {
      error:
        'Expected { date, stats (InsightsLambdaStatsPayload), sessionTimeline?: [...] }',
    });
  }

  const y = body.comparison?.yesterday;
  if (y !== undefined && !isInsightsLambdaStatsPayload(y)) {
    return json(400, { error: 'comparison.yesterday must match insights stats payload shape' });
  }

  const sessionTimeline = parseSessionTimeline(body.sessionTimeline);

  const client = new OpenAI({ apiKey: openAiKey });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: buildUserPrompt(body.stats, {
            sessionTimeline,
            comparison: y ? { yesterday: y } : undefined,
          }),
        },
      ],
      max_tokens: 1200,
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

async function handleWeeklyInsights(body: GenerateRequestBody, openAiKey: string): Promise<APIGatewayProxyResultV2> {
  if (
    !body.weekStart ||
    !body.weekEnd ||
    typeof body.weekStart !== 'string' ||
    typeof body.weekEnd !== 'string' ||
    !body.aggregated ||
    !body.dailyStats ||
    !Array.isArray(body.dailyStats)
  ) {
    return json(400, {
      error:
        'Expected { weekStart, weekEnd, aggregated (weekly totals), dailyStats (array of daily stats) }',
    });
  }

  const client = new OpenAI({ apiKey: openAiKey });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildWeeklySystemPrompt() },
        {
          role: 'user',
          content: buildWeeklyUserPrompt(body.aggregated, body.dailyStats),
        },
      ],
      max_tokens: 1500,
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

async function handleSeedApps(body: GenerateRequestBody, openAiKey: string): Promise<APIGatewayProxyResultV2> {
  const parsed = parseSeedAppsBody(body);
  if (!parsed) {
    return json(400, {
      error: 'Expected { mode:"seedApps", allowedCategories: string[], apps: [{appName, executablePath?, installLocation?, source?}] }',
    });
  }

  const client = new OpenAI({ apiKey: openAiKey });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSeedAppsSystemPrompt() },
        {
          role: 'user',
          content: buildSeedAppsUserPrompt({
            allowedCategories: parsed.allowedCategories,
            apps: parsed.apps,
          }),
        },
      ],
      max_tokens: 1400,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const rawText =
      completion.choices[0]?.message?.content ?? '{"mappings":[]}';
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText) as unknown;
    } catch {
      return json(502, { error: 'Model returned invalid JSON' });
    }

    const normalized = normalizeSeedAppsResponse(parsedJson, parsed.allowedCategories);
    return json(200, normalized);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'OpenAI error';
    return json(503, { error: message });
  }
}
