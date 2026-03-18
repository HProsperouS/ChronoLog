/** Returns today's date as YYYY-MM-DD using local time (timezone-safe) */
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formats a Date to YYYY-MM-DD using local time */
export function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a duration in minutes to a human-readable string with exactly 2 decimal places.
 * Examples: 5.2 → "5.20m", 65.71 → "1h 5.71m", 120 → "2h 0.00m"
 */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes * 100) / 100;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m === 0) return `${h}h`;
  return h > 0 ? `${h}h ${m.toFixed(2)}m` : `${m.toFixed(2)}m`;
}
