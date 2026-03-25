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
 * Formats a duration in minutes to a compact human-readable string.
 * Examples:
 *   0      -> "0m"
 *   0.4    -> "0m"
 *   5.2    -> "5m"
 *   11.4   -> "11m"
 *   59.6   -> "1h"
 *   65.71  -> "1h 6m"
 *   120    -> "2h"
 */
export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, minutes);

  if (safeMinutes < 1) {
    const totalSeconds = Math.max(1, Math.round(safeMinutes * 60));
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.round(safeMinutes);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (m === 0) {
    return `${h}h`;
  }

  return `${h}h ${m}m`;
}