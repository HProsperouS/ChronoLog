import 'dotenv/config';
import activeWin from 'active-win';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const POLL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 5) * 1000;
const MIN_DURATION_SECONDS = 10; // ignore sessions shorter than this
const IDLE_THRESHOLD_MS = Number(process.env.IDLE_THRESHOLD_MINUTES ?? 5) * 60 * 1000;

interface Session {
  appName: string;
  windowTitle?: string;
  url?: string;
  startTime: Date;
}

let current: Session | null = null;
let lastChangeAt = Date.now();

// ─── helpers ──────────────────────────────────────────────────────────────────

function windowKey(win: activeWin.Result): string {
  return `${win.owner.name}||${win.title}`;
}

async function postActivity(session: Session, endTime: Date): Promise<void> {
  const durationMs = endTime.getTime() - session.startTime.getTime();
  const durationMinutes = durationMs / 1000 / 60;

  if (durationMinutes * 60 < MIN_DURATION_SECONDS) return;

  const body = {
    appName: session.appName,
    windowTitle: session.windowTitle,
    url: session.url,
    duration: Math.round(durationMinutes * 10) / 10,
    startTime: session.startTime.toISOString(),
    endTime: endTime.toISOString(),
  };

  try {
    const res = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[tracker] POST failed: ${res.status}`);
    }
  } catch (err) {
    console.error('[tracker] Could not reach backend:', (err as Error).message);
  }
}

function extractUrl(win: activeWin.Result): string | undefined {
  // active-win provides url for browsers on Windows/macOS
  if ('url' in win && typeof win.url === 'string') return win.url;
  return undefined;
}

// ─── main loop ────────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  let win: activeWin.Result | undefined;

  try {
    win = await activeWin() ?? undefined;
  } catch {
    // active-win can throw on locked screen or UAC dialogs – just skip
    return;
  }

  const now = Date.now();
  // const idleForMs = now - lastChangeAt;
  // const isIdle = idleForMs > IDLE_THRESHOLD_MS;

  if (!win) {
    // Screen locked – close current session
    if (current) {
      await postActivity(current, new Date());
      current = null;
    }
    return;
  }

  /* Idle detection disabled – re-enable when ready
  if (isIdle) {
    if (current) {
      await postActivity(current, new Date());
      current = null;
    }
    return;
  }
  */

  const appName = win.owner.name;
  const windowTitle = win.title || undefined;
  const url = extractUrl(win);

  if (!current) {
    // First window detected
    current = { appName, windowTitle, url, startTime: new Date() };
    lastChangeAt = now;
    return;
  }

  const changed = windowKey(win) !== `${current.appName}||${current.windowTitle ?? ''}`;

  if (changed) {
    await postActivity(current, new Date());
    current = { appName, windowTitle, url, startTime: new Date() };
    lastChangeAt = now;
  }
}

// ─── graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('\n[tracker] Shutting down...');
  if (current) {
    await postActivity(current, new Date());
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

// ─── start ────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  console.log(`[tracker] Started – polling every ${POLL_MS / 1000}s, API: ${API_URL}`);
  await poll();
  setInterval(() => void poll(), POLL_MS);
}

void start();
