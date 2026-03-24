import './load-env';
import activeWin from 'active-win';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const MIN_DURATION_SECONDS = 5;
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const TRACKER_STATE_FILE = path.join(DATA_DIR, 'tracker-state.json');

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

  } catch {
    return 0; // fallback: assume not idle
  }
  return 0;
}

// ─── Private browsing detection ───────────────────────────────────────────────

const PRIVATE_TITLE_KEYWORDS = ['private', 'incognito', 'inprivate', 'navigation privée'];
const BROWSER_APP_RE = /chrome|safari|firefox|arc|brave|edge|opera/i;

function isBrowserApp(appName: string): boolean {
  return BROWSER_APP_RE.test(appName);
}

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

function ensureStateDir(): void {
  fs.mkdirSync(path.dirname(TRACKER_STATE_FILE), { recursive: true });
}

function saveTrackerState(session: Session | null): void {
  ensureStateDir();
  if (!session) {
    try { fs.unlinkSync(TRACKER_STATE_FILE); } catch { /* state file may not exist */ }
    return;
  }
  const payload = {
    appName: session.appName,
    windowTitle: session.windowTitle,
    url: session.url,
    startTime: session.startTime.toISOString(),
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(TRACKER_STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function loadTrackerState(): Session | null {
  try {
    if (!fs.existsSync(TRACKER_STATE_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(TRACKER_STATE_FILE, 'utf8')) as {
      appName?: string;
      windowTitle?: string;
      url?: string;
      startTime?: string;
    };
    if (!raw.appName || !raw.startTime) return null;
    const start = new Date(raw.startTime);
    if (Number.isNaN(start.getTime())) return null;
    return {
      appName: raw.appName,
      windowTitle: raw.windowTitle,
      url: raw.url,
      startTime: start,
    };
  } catch {
    return null;
  }
}

async function postActivity(session: Session, endTime: Date): Promise<boolean> {
  const durationMs = endTime.getTime() - session.startTime.getTime();
  if (durationMs / 1_000 < MIN_DURATION_SECONDS) return true;

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
    if (!res.ok) {
      console.error(`[tracker] POST failed: ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[tracker] Could not reach backend:', (err as Error).message);
    return false;
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
    if (current) {
      await postActivity(current, new Date());
      current = null;
      saveTrackerState(null);
    }
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
        saveTrackerState(null);
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
    if (current) {
      await postActivity(current, new Date());
      current = null;
      saveTrackerState(null);
    }
    return;
  }

  const appName     = win.owner.name;
  const windowTitle = win.title || undefined;
  const rawUrl      = extractUrl(win);
  const url         = isBrowserApp(appName) ? rawUrl : undefined;

  // 4. Excluded apps
  if (config.excludedApps.has(appName.toLowerCase())) {
    if (current) {
      await postActivity(current, new Date());
      current = null;
      saveTrackerState(null);
    }
    return;
  }

  // 5. Private browsing — record the app but strip the URL
  const recordUrl = config.respectPrivateBrowsing && isPrivateBrowsing(windowTitle, url)
    ? undefined
    : url;

  // 6. Session tracking
  // For browsers, group by URL hostname so that title changes (e.g. YouTube
  // switching videos) don't fragment the session into many tiny pieces.
  const sessionKey = (app: string, title: string | undefined, u: string | undefined) => {
    if (isBrowserApp(app)) {
      if (u) {
        try { return app + '|' + new URL(u).hostname; } catch { /* fall through */ }
      }
      // URL may be unavailable in some browser privacy/permission states.
      // Using only app name avoids fragmenting one browsing period by tab title.
      return app;
    }
    return app + '|' + (title ?? '');
  };

  const sameWindow =
    current &&
    sessionKey(current.appName, current.windowTitle, current.url) ===
    sessionKey(appName, windowTitle, recordUrl);

  if (!current) {
    current = { appName, windowTitle, url: recordUrl, startTime: new Date() };
    saveTrackerState(current);
  } else if (!sameWindow) {
    await postActivity(current, new Date());
    current = { appName, windowTitle, url: recordUrl, startTime: new Date() };
    saveTrackerState(current);
  } else {
    // Same session — keep title/url up to date so category rules stay accurate
    current.windowTitle = windowTitle;
    current.url = recordUrl;
    saveTrackerState(current);
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
  if (current) {
    await postActivity(current, new Date());
    current = null;
  }
  saveTrackerState(null);
  process.exit(0);
}

process.on('SIGINT',  () => void shutdown());
process.on('SIGTERM', () => void shutdown());

// ─── Start ────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  await fetchConfig();
  const recovered = loadTrackerState();
  if (recovered) {
    const ok = await postActivity(recovered, new Date());
    if (ok) {
      saveTrackerState(null);
      console.log('[tracker] Recovered previous session tail on startup');
    } else {
      console.log('[tracker] Recovery post failed, keeping state file for retry');
    }
  }
  console.log(`[tracker] Started — poll ${config.pollIntervalMs / 1_000}s, idle ${config.idleThresholdMinutes}min, API: ${API_URL}`);
  await poll();
  reschedulePoller();
  // Refresh config from backend every 60 seconds
  setInterval(() => void fetchConfig(), 60_000);
}

void start();
