import 'dotenv/config';
import activeWin from 'active-win';
import { execSync } from 'child_process';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const MIN_DURATION_SECONDS = 10;

// ─── Config (refreshed from backend every 60 s) ───────────────────────────────

interface TrackerConfig {
  trackingEnabled:        boolean;
  idleDetectionEnabled:   boolean;
  idleThresholdMinutes:   number;
  pollIntervalMs:         number;
  excludedApps:           Set<string>; // lower-cased
  respectPrivateBrowsing: boolean;
}

let config: TrackerConfig = {
  trackingEnabled:        true,
  idleDetectionEnabled:   true,
  idleThresholdMinutes:   5,
  pollIntervalMs:         5_000,
  excludedApps:           new Set(),
  respectPrivateBrowsing: true,
};

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function fetchConfig(): Promise<void> {
  try {
    const [sRes, pRes] = await Promise.all([
      fetch(`${API_URL}/api/settings`),
      fetch(`${API_URL}/api/settings/privacy`),
    ]);

    if (sRes.ok) {
      const { settings } = (await sRes.json()) as { settings: Record<string, unknown> };
      config.trackingEnabled      = (settings.trackingEnabled      as boolean) ?? true;
      config.idleDetectionEnabled = (settings.idleDetectionEnabled as boolean) ?? true;
      config.idleThresholdMinutes = (settings.idleThresholdMinutes as number)  ?? 5;

      const newPollMs = ((settings.pollIntervalSeconds as number) ?? 5) * 1_000;
      if (newPollMs !== config.pollIntervalMs) {
        config.pollIntervalMs = newPollMs;
        reschedulePoller();
      }
    }

    if (pRes.ok) {
      const privacy = (await pRes.json()) as {
        excludedApps:           string[];
        respectPrivateBrowsing: boolean;
      };
      config.excludedApps           = new Set((privacy.excludedApps ?? []).map(a => a.toLowerCase()));
      config.respectPrivateBrowsing = privacy.respectPrivateBrowsing ?? true;
    }
  } catch {
    // Backend not ready yet — keep current config
  }
}

// ─── System idle time (cross-platform) ───────────────────────────────────────

function getSystemIdleSeconds(): number {
  try {
    if (process.platform === 'darwin') {
      const out = execSync(
        "ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print int($NF/1000000000); exit}'",
        { timeout: 1_000, stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString().trim();
      return parseInt(out, 10) || 0;
    }

    if (process.platform === 'win32') {
      // GetLastInputInfo via inline PowerShell
      const ps = [
        "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices;",
        "public class IdleTimer {",
        "  [DllImport(\"user32.dll\")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO i);",
        "  public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }",
        "}'",
        "$i = New-Object IdleTimer+LASTINPUTINFO; $i.cbSize = 8;",
        "[IdleTimer]::GetLastInputInfo([ref]$i) | Out-Null;",
        "[Math]::Floor(([Environment]::TickCount - $i.dwTime) / 1000)",
      ].join(' ');
      const out = execSync(`powershell -NoProfile -Command "${ps}"`, {
        timeout: 3_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim();
      return parseInt(out, 10) || 0;
    }

    // Linux — requires xprintidle (returns ms)
    const out = execSync('xprintidle', {
      timeout: 1_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return Math.floor(parseInt(out, 10) / 1_000);
  } catch {
    return 0; // fallback: assume not idle
  }
}

// ─── Private browsing detection ───────────────────────────────────────────────

const PRIVATE_TITLE_KEYWORDS = ['private', 'incognito', 'inprivate', 'navigation privée'];

function isPrivateBrowsing(title: string | undefined, url: string | undefined): boolean {
  const t = (title ?? '').toLowerCase();
  if (PRIVATE_TITLE_KEYWORDS.some(k => t.includes(k))) return true;
  // Chrome / Firefox internal scheme URLs are never private per se,
  // but chrome-extension:// and about:blank should not be recorded as URLs
  if (url && (url.startsWith('chrome-extension://') || url === 'about:blank')) return true;
  return false;
}

// ─── Activity posting ─────────────────────────────────────────────────────────

interface Session {
  appName:      string;
  windowTitle?: string;
  url?:         string;
  startTime:    Date;
}

let current: Session | null = null;

async function postActivity(session: Session, endTime: Date): Promise<void> {
  const durationMs = endTime.getTime() - session.startTime.getTime();
  if (durationMs / 1_000 < MIN_DURATION_SECONDS) return;

  const body = {
    appName:     session.appName,
    windowTitle: session.windowTitle,
    url:         session.url,
    duration:    Math.round((durationMs / 1_000 / 60) * 10) / 10,
    startTime:   session.startTime.toISOString(),
    endTime:     endTime.toISOString(),
  };

  try {
    const res = await fetch(`${API_URL}/api/activities`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) console.error(`[tracker] POST failed: ${res.status}`);
  } catch (err) {
    console.error('[tracker] Could not reach backend:', (err as Error).message);
  }
}

function extractUrl(win: activeWin.Result): string | undefined {
  if ('url' in win && typeof win.url === 'string') return win.url;
  return undefined;
}

// ─── Main poll ────────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  // 1. Tracking disabled — flush and do nothing
  if (!config.trackingEnabled) {
    if (current) { await postActivity(current, new Date()); current = null; }
    return;
  }

  // 2. Idle detection
  if (config.idleDetectionEnabled) {
    const idleSecs = getSystemIdleSeconds();
    const thresholdSecs = config.idleThresholdMinutes * 60;
    if (idleSecs >= thresholdSecs) {
      if (current) {
        // Back-date the end time to when idle actually started
        const endTime = new Date(Date.now() - idleSecs * 1_000);
        await postActivity(current, endTime);
        current = null;
        console.log(`[tracker] Idle ${idleSecs}s ≥ ${thresholdSecs}s — session closed`);
      }
      return;
    }
  }

  // 3. Read active window
  let win: activeWin.Result | undefined;
  try {
    win = (await activeWin()) ?? undefined;
  } catch {
    return; // locked screen / UAC dialog — skip silently
  }

  if (!win) {
    if (current) { await postActivity(current, new Date()); current = null; }
    return;
  }

  const appName     = win.owner.name;
  const windowTitle = win.title || undefined;
  const url         = extractUrl(win);

  // 4. Excluded apps
  if (config.excludedApps.has(appName.toLowerCase())) {
    if (current) { await postActivity(current, new Date()); current = null; }
    return;
  }

  // 5. Private browsing — record the app but strip the URL
  const recordUrl = config.respectPrivateBrowsing && isPrivateBrowsing(windowTitle, url)
    ? undefined
    : url;

  // 6. Session tracking
  const sameWindow =
    current &&
    current.appName === appName &&
    (current.windowTitle ?? '') === (windowTitle ?? '');

  if (!current) {
    current = { appName, windowTitle, url: recordUrl, startTime: new Date() };
  } else if (!sameWindow) {
    await postActivity(current, new Date());
    current = { appName, windowTitle, url: recordUrl, startTime: new Date() };
  }
}

// ─── Poller scheduling ────────────────────────────────────────────────────────

function reschedulePoller(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => void poll(), config.pollIntervalMs);
  console.log(`[tracker] Poll interval → ${config.pollIntervalMs / 1_000}s`);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('\n[tracker] Shutting down…');
  if (pollTimer) clearInterval(pollTimer);
  if (current) await postActivity(current, new Date());
  process.exit(0);
}

process.on('SIGINT',  () => void shutdown());
process.on('SIGTERM', () => void shutdown());

// ─── Start ────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  await fetchConfig();
  console.log(`[tracker] Started — poll ${config.pollIntervalMs / 1_000}s, idle ${config.idleThresholdMinutes}min, API: ${API_URL}`);
  await poll();
  reschedulePoller();
  // Refresh config from backend every 60 seconds
  setInterval(() => void fetchConfig(), 60_000);
}

void start();
