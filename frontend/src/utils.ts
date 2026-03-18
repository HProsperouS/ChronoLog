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
 * Formats a duration in minutes to a human-readable string.
 * Always rounds to at most 1 decimal place to avoid float noise.
 * Examples: 5.2 → "5.2m", 65.7 → "1h 5.7m", 120 → "2h 0m"
 */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes * 10) / 10;
  const h = Math.floor(total / 60);
  const m = parseFloat((total % 60).toFixed(1));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
