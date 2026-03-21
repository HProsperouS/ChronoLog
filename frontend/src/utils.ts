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

/** Add calendar days to a YYYY-MM-DD string (local date arithmetic). */
export function addDaysYmd(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return dateStr(d);
}

/**
 * Monday of the calendar week that contains `ymd` (local time).
 * Week = Mon–Sun (common for productivity; aligns with ISO week in many regions).
 */
export function startOfWeekMonday(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const deltaToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + deltaToMonday);
  return dateStr(d);
}

/** Sunday at the end of the week whose Monday is `weekStartMondayYmd`. */
export function endOfWeekSunday(weekStartMondayYmd: string): string {
  return addDaysYmd(weekStartMondayYmd, 6);
}

/** e.g. "Mar 17 – Mar 23, 2026" for a Mon–Sun range (local). */
export function formatCalendarWeekRange(weekStartYmd: string, weekEndYmd: string, locale = 'en-US'): string {
  const a = new Date(`${weekStartYmd}T12:00:00`);
  const b = new Date(`${weekEndYmd}T12:00:00`);
  const md: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const full: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.toLocaleDateString(locale, md)} – ${b.getDate()}, ${b.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.toLocaleDateString(locale, md)} – ${b.toLocaleDateString(locale, full)}`;
  }
  return `${a.toLocaleDateString(locale, full)} – ${b.toLocaleDateString(locale, full)}`;
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
  return h > 0 ? `${h}h ${m.toFixed(1)}m` : `${m.toFixed(1)}m`;
}
