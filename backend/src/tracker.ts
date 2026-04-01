import './load-env';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const MIN_DURATION_SECONDS = 5;
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const TRACKER_STATE_FILE = path.join(DATA_DIR, 'tracker-state.json');
const MAX_RECOVERY_GAP_MS = 5 * 60_000;

// ─── Config (refreshed from backend every 60 s) ───────────────────────────────

interface TrackerConfig {
  trackingEnabled:        boolean;
  idleDetectionEnabled:   boolean;
  idleThresholdMinutes:   number;
  pollIntervalMs:         number;
  excludedApps:           Set<string>; // normalized app identifiers
  respectPrivateBrowsing: boolean;
}

let config: TrackerConfig = {
  trackingEnabled:        true,
  idleDetectionEnabled:   true,
  idleThresholdMinutes:   5,
  pollIntervalMs:         1_000,
  excludedApps:           new Set(),
  respectPrivateBrowsing: true,
};

let pollTimer: ReturnType<typeof setInterval> | null = null;

function normalizeAppId(value?: string): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.app$/i, '')
    .replace(/\.exe$/i, '')
    .replace(/\s+/g, ' ');
}

type ActiveWindowResult = {
  title?: string | null;
  url?: string;
  owner: {
    name: string;
  };
};

type ActiveWindowFn = (options?: {
  accessibilityPermission?: boolean;
  screenRecordingPermission?: boolean;
}) => Promise<ActiveWindowResult | undefined>;

const dynamicImport = new Function(
  'specifier',
  'return import(specifier);'
) as (specifier: string) => Promise<Record<string, unknown>>;

let loadedActiveWindowFn: ActiveWindowFn | null = null;
let activeWindowLoadFailed = false;

function resolveActiveWinPlatformModulePath(): string | null {
  let getWindowsEntry: string;
  try {
    getWindowsEntry = require.resolve('get-windows');
  } catch {
    return null;
  }

  const getWindowsDir = path.dirname(getWindowsEntry);
  if (process.platform === 'darwin') return path.join(getWindowsDir, 'lib', 'macos.js');
  if (process.platform === 'win32') return path.join(getWindowsDir, 'lib', 'windows.js');
  if (process.platform === 'linux') return path.join(getWindowsDir, 'lib', 'linux.js');
  return null;
}

async function getActiveWindowFn(): Promise<ActiveWindowFn | null> {
  if (loadedActiveWindowFn) return loadedActiveWindowFn;
  if (activeWindowLoadFailed) return null;

  const modulePath = resolveActiveWinPlatformModulePath();
  if (!modulePath) {
    activeWindowLoadFailed = true;
    console.error(`[tracker] get-windows unsupported or missing on platform: ${process.platform}`);
    return null;
  }

  try {
    const moduleUrl = pathToFileURL(modulePath).href;
    const mod = await dynamicImport(moduleUrl);
    const candidate = mod.activeWindow;
    if (typeof candidate !== 'function') {
      throw new Error(`activeWindow export missing from ${modulePath}`);
    }
    loadedActiveWindowFn = candidate as ActiveWindowFn;
    console.log(`[tracker] get-windows loaded via ${modulePath}`);
    return loadedActiveWindowFn;
  } catch (err) {
    activeWindowLoadFailed = true;
    console.error('[tracker] Failed to load get-windows module:', err);
    return null;
  }
}

// ─── macOS permission prompt backoff ──────────────────────────────────────────
// If the app lacks Screen Recording / Accessibility permissions, querying the
// active window can trigger repeated OS permission prompts. When we detect a
// likely permissions error, back off for a while to avoid spamming the user.
let macPermissionBackoffUntilMs = 0;
let macPermissionWarnedAtMs = 0;

function isLikelyMacPermissionsError(err: unknown): boolean {
  if (process.platform !== 'darwin') return false;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /screen\s*recording|tcc|not\s+authorized|not\s+permitted|permission|accessibility/i.test(msg);
}

function enterMacPermissionBackoff(nowMs: number, err: unknown): void {
  // Back off long enough that the user can act, but not forever.
  const BACKOFF_MS = 10 * 60_000;
  macPermissionBackoffUntilMs = Math.max(macPermissionBackoffUntilMs, nowMs + BACKOFF_MS);

  // Log at most once per minute to keep logs readable.
  if (nowMs - macPermissionWarnedAtMs > 60_000) {
    macPermissionWarnedAtMs = nowMs;
    const msg = err instanceof Error ? err.message : String(err ?? 'permission error');
    console.warn(`[tracker] macOS permissions likely missing; backing off ${BACKOFF_MS / 60_000}m. Error: ${msg}`);
  }
}

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

      const newPollMs = ((settings.pollIntervalSeconds as number) ?? 1) * 1_000;
      if (newPollMs !== config.pollIntervalMs) {
        config.pollIntervalMs = newPollMs;
        reschedulePoller();
      }
    }

    if (pRes.ok) {
      const payload = (await pRes.json()) as {
        privacy?: {
          excludedApps?: string[];
          respectPrivateBrowsing?: boolean;
        };
        excludedApps?: string[];
        respectPrivateBrowsing?: boolean;
      };

      // Current API shape is { privacy: {...} }.
      // Keep backward compatibility with older flat payloads.
      const privacy = payload.privacy ?? payload;
      const excludedApps = Array.isArray(privacy.excludedApps) ? privacy.excludedApps : [];

      config.excludedApps = new Set(excludedApps.map(normalizeAppId).filter(Boolean));
      config.respectPrivateBrowsing =
        typeof privacy.respectPrivateBrowsing === 'boolean'
          ? privacy.respectPrivateBrowsing
          : true;
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
      const ps = [
        "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices;",
        "public static class IdleTimer {",
        "  [StructLayout(LayoutKind.Sequential)]",
        "  public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }",
        "  [DllImport(\"user32.dll\")]",
        "  public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);",
        "}'",
        "$i = New-Object IdleTimer+LASTINPUTINFO",
        "$i.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($i)",
        "$ok = [IdleTimer]::GetLastInputInfo([ref]$i)",
        "if (-not $ok) { Write-Output 0; exit }",
        "$tick = [Environment]::TickCount64",
        "$last = [int64][uint32]$i.dwTime",
        "$idleMs = $tick - $last",
        "if ($idleMs -lt 0 -or $idleMs -gt 86400000) { Write-Output 0; exit }",
        "[Math]::Floor($idleMs / 1000)"
      ].join('; ');

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

  const isSelfActivity = isChronoLogSelfActivity(session.appName, session.windowTitle);

  const payload = {
    appName: isSelfActivity ? 'ChronoLog' : session.appName,
    windowTitle: session.windowTitle,
    url: session.url,
    startTime: session.startTime.toISOString(),
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(TRACKER_STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function loadTrackerState(): { session: Session; savedAt: Date } | null {
  try {
    if (!fs.existsSync(TRACKER_STATE_FILE)) return null;

    const raw = JSON.parse(fs.readFileSync(TRACKER_STATE_FILE, 'utf8')) as {
      appName?: string;
      windowTitle?: string;
      url?: string;
      startTime?: string;
      savedAt?: string;
    };

    if (!raw.appName || !raw.startTime || !raw.savedAt) return null;

    const start = new Date(raw.startTime);
    const savedAt = new Date(raw.savedAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(savedAt.getTime())) {
      return null;
    }

    return {
      session: {
        appName: raw.appName,
        windowTitle: raw.windowTitle,
        url: raw.url,
        startTime: start,
      },
      savedAt,
    };
  } catch {
    return null;
  }
}

async function postActivity(session: Session, endTime: Date): Promise<boolean> {
  const isSelfActivity = isChronoLogSelfActivity(session.appName, session.windowTitle);
  const durationMs = endTime.getTime() - session.startTime.getTime();
  const durationSeconds = durationMs / 1_000;

  if (durationSeconds < MIN_DURATION_SECONDS) {
    console.log(
      `[tracker] skipping short session (${durationSeconds.toFixed(1)}s) for ${session.appName}`
    );
    return true;
  }

  const body = {
    appName: isSelfActivity ? 'ChronoLog' : session.appName,
    windowTitle: session.windowTitle,
    url: session.url,
    duration: Math.round((durationMs / 1_000 / 60) * 10) / 10,
    startTime: session.startTime.toISOString(),
    endTime: endTime.toISOString(),
    excludeFromAnalytics: isSelfActivity,
  };

  try {
    const res = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

function extractUrl(win: ActiveWindowResult): string | undefined {
  if ('url' in win && typeof win.url === 'string') return win.url;
  return undefined;
}

function isChronoLogSelfActivity(
  appName: string,
  windowTitle?: string
): boolean {
  const app = (appName ?? '').trim().toLowerCase();
  const title = (windowTitle ?? '').trim().toLowerCase();

  if (app === 'chronolog') return true;
  if (app === 'electron' && title.includes('chronolog')) return true;

  return false;
}

// ─── Main poll ────────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  // macOS permissions backoff: avoid repeatedly triggering OS prompts.
  if (process.platform === 'darwin') {
    const now = Date.now();
    if (now < macPermissionBackoffUntilMs) {
      // If we were tracking something, flush it so we don't attribute idle time incorrectly.
      if (current) {
        await postActivity(current, new Date());
        current = null;
        saveTrackerState(null);
      }
      return;
    }
  }

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

    // Ignore suspicious readings instead of blocking tracking forever
    if (idleSecs >= 0 && idleSecs <= 86400 && idleSecs >= thresholdSecs) {
      if (current) {
        // Back-date the end time to when idle actually started
        const endTime = new Date(Date.now() - idleSecs * 1_000);
        await postActivity(current, endTime);
        current = null;
        saveTrackerState(null);
      }
      return;
    }
  }

  // 3. Read active window
  const activeWindowFn = await getActiveWindowFn();
  if (!activeWindowFn) return;

  let win: ActiveWindowResult | undefined;
  try {
    win = (await activeWindowFn(
      process.platform === 'darwin'
        ? {
            accessibilityPermission: true,
            screenRecordingPermission: true,
          }
        : undefined
    )) ?? undefined;
  } catch (err) {
    console.error('[tracker] activeWin failed:', err);
    if (isLikelyMacPermissionsError(err)) {
      enterMacPermissionBackoff(Date.now(), err);
    }
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
  const windowTitle =
    typeof win.title === 'string' && win.title.trim().length > 0
      ? win.title.trim()
      : undefined;
  const rawUrl      = extractUrl(win);
  const url         = isBrowserApp(appName) ? rawUrl : undefined;

if (/firefox|chrome|edge|arc/i.test(appName)) {
  console.log('[tracker:url-debug]', {
    appName,
    title: windowTitle,
    rawUrl,
    url,
  });
}

  // 4. Excluded apps
  if (config.excludedApps.has(normalizeAppId(appName))) {
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
  const normalizeBrowserUrl = (rawUrl: string): string => {
    try {
      const parsed = new URL(rawUrl);

      // Ignore in-page anchors like #section
      parsed.hash = '';

      // Remove common tracking parameters
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('utm_term');
      parsed.searchParams.delete('utm_content');
      parsed.searchParams.delete('utm_id');
      parsed.searchParams.delete('utm_name');

      // Normalize trailing slash for non-root paths
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }

      return parsed.toString();
    } catch {
      return rawUrl;
    }
  };

  const sessionKey = (app: string, title: string | undefined, u: string | undefined) => {
    if (isBrowserApp(app)) {
      const normalizedUrl = u ? normalizeBrowserUrl(u) : '';
      const normalizedTitle = (title ?? '').trim();
      return app + '|' + normalizedUrl + '|' + normalizedTitle;
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
    // Same session — refresh metadata for the current activity
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
    const recoveryGapMs = Date.now() - recovered.savedAt.getTime();

    if (recoveryGapMs <= MAX_RECOVERY_GAP_MS) {
      const ok = await postActivity(recovered.session, new Date());
      if (ok) {
        saveTrackerState(null);
        console.log('[tracker] Recovered previous session tail on startup');
      } else {
        console.log('[tracker] Recovery post failed, keeping state file for retry');
      }
    } else {
      saveTrackerState(null);
      console.log(
        `[tracker] Discarded stale tracker state on startup (${Math.round(recoveryGapMs / 1000)}s old)`
      );
    }
  }

  console.log(`[tracker] Started — poll ${config.pollIntervalMs / 1_000}s, idle ${config.idleThresholdMinutes}min, API: ${API_URL}`);
  await poll();
  reschedulePoller();
  // Refresh config from backend every 60 seconds
  setInterval(() => void fetchConfig(), 60_000);
}

void start();
