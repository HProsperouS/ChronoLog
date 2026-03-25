import { useEffect, useRef } from 'react';
import * as api from '../api';
import { todayStr } from '../utils';

// ─── Thresholds ───────────────────────────────────────────────────────────────
const CONTEXT_SWITCH_THRESHOLD  = 8;   // switches before warning
const ENTERTAINMENT_THRESHOLD   = 45;   // minutes before warning
const LOW_FOCUS_THRESHOLD       = 40;   // focus score below this = warning
const MIN_PRODUCTIVE_RATIO       = 0.3;  // 30% of screen time should be productive
const LONG_SESSION_THRESHOLD    = 90;   // minutes without a break
const CHECK_INTERVAL_MS         = 1 * 60 * 1000; // check every minute

// ─── Cooldown tracking (avoid spamming the same notification) ─────────────────
const lastFired: Record<string, number> = {};
const COOLDOWN_MS = 15 * 60 * 1000;  // 15 minute cooldown per notification type

// // Change these temporarily for testing (INCLUDING COOLDOWN TRACKING SETTINGS):
// const CONTEXT_SWITCH_THRESHOLD  = 0;   // will always trigger
// const ENTERTAINMENT_THRESHOLD   = 0;   // will always trigger
// const LOW_FOCUS_THRESHOLD       = 100; // will always trigger
// const LONG_SESSION_THRESHOLD    = 0;   // will always trigger
// const CHECK_INTERVAL_MS         = 5 * 1000; // check every 5 SECONDS instead of 30 mins

// // // ─── Cooldown tracking (avoid spamming the same notification) ─────────────────
// const lastFired: Record<string, number> = {};
// const COOLDOWN_MS = 5 * 1000;


function canFire(key: string): boolean {
  const now = Date.now();
  if (!lastFired[key] || now - lastFired[key] > COOLDOWN_MS) {
    lastFired[key] = now;
    // console.log(`✅ canFire: ${key}`);
    return true;
  }
//   console.log(`⏳ Cooldown active for: ${key}`);
  return false;
}

// ─── Show notification ────────────────────────────────────────────────────────
async function notify(title: string, body: string) {
  // Electron: main-process Notification uses app/dock branding; Web Notification on macOS
  // shows the host (Electron) on the left and `icon` as a secondary image on the right.
  if (window.electronAPI?.showNotification) {
    await window.electronAPI.showNotification(title, body);
    return;
  }
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
    });
  }
}

// ─── Main check logic ─────────────────────────────────────────────────────────
async function runChecks() {
  try {
    // console.log('Permission status:', Notification.permission);
    // console.log('🔔 Running notification checks...');
    // Respect the notificationsEnabled setting
    const settings = await api.getSettings().catch(() => null);
    
    // console.log('Settings:', settings);

    if (settings && !settings.notificationsEnabled) {
        // console.log('❌ Notifications disabled in settings');
        return;
    }
     
    const stats = await api.getDailyStats(todayStr());
    // console.log('Stats:', stats);

    // 1. Too many context switches
    if (stats.contextSwitches >= CONTEXT_SWITCH_THRESHOLD && canFire('contextSwitches')) {
      notify(
        '🔀 Focus Fragmentation Detected',
        `You've switched context ${stats.contextSwitches} times today. Try staying on one task at a time!`,
      );
    }

    // 2. Too much entertainment time
    const entertainmentMins = stats.categoryTotals.Entertainment;
    if (entertainmentMins >= ENTERTAINMENT_THRESHOLD && canFire('entertainment')) {
      notify(
        '🎮 Entertainment Check',
        `You've spent ${entertainmentMins} minutes on entertainment today. Time to refocus?`,
      );
    }

    // 3. Low focus score
    if (stats.focusScore > 0 && stats.focusScore < LOW_FOCUS_THRESHOLD && canFire('lowFocus')) {
      notify(
        '📉 Low Focus Score',
        `Your focus score is ${stats.focusScore}% today. Try minimising distractions to boost it!`,
      );
    }

    // 4. Long session without a break
    if (stats.longestSession >= LONG_SESSION_THRESHOLD && canFire('longSession')) {
      notify(
        '⏰ Time for a Break!',
        `You've had a ${stats.longestSession}-minute session today. Remember to take regular breaks!`,
      );
    }

    // 5. Unproductive day (low productive time ratio)
    const productiveMins = stats.categoryTotals.Work + stats.categoryTotals.Study;
    const productiveRatio = stats.totalTime > 0 ? productiveMins / stats.totalTime : 0;
    if (stats.totalTime > 60 && productiveRatio < MIN_PRODUCTIVE_RATIO && canFire('unproductive')) {
      notify(
        '💡 Productivity Reminder',
        `Only ${Math.round(productiveRatio * 100)}% of your screen time has been productive today. You got this!`,
      );
    }

  } catch (e) {
    // console.error('Notification check failed:', e);
    // Backend not ready yet or no data — silently skip
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const permissionRequested = useRef(false);

  useEffect(() => {
    // Request permission once on first mount
    if (!permissionRequested.current && Notification.permission === 'default') {
      permissionRequested.current = true;
      Notification.requestPermission();
    }

    // Run once immediately, then on interval
    void runChecks();
    const timer = setInterval(() => void runChecks(), CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
}
