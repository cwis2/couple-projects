import type { CalendarEvent, CleanupResult } from "./types";

/**
 * Formats a Date object or UTC year/month/day to 'YYYY-MM-DD'
 */
export function formatDateString(year: number, month1Indexed: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month1Indexed).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses a Date, timestamp, or 'YYYY-MM-DD' string into year, 0-indexed month, and day.
 */
export function parseDateParts(input: Date | string | number): { year: number; month: number; day: number } {
  if (typeof input === "string") {
    // If format is YYYY-MM-DD
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim());
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10) - 1, // 0-indexed
        day: parseInt(match[3], 10),
      };
    }
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth(),
        day: parsed.getUTCDate(),
      };
    }
  }

  const d = typeof input === "number" ? new Date(input) : input instanceof Date ? input : new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

/**
 * Computes the cutoff date for the monthly cleanup rule:
 * - Weeks run Sunday to Saturday.
 * - Cutoff is the Sunday on or before the 1st of the current month.
 * - Any event where date < cutoff is deleted.
 * 
 * Example 1:
 * If the month starts on Wednesday (e.g. 2023-11-01), the Sunday before it is 2023-10-29.
 * Cutoff = 2023-10-29.
 * 
 * Example 2:
 * If the 1st is a Sunday (e.g. 2026-11-01), the cutoff is the 1st itself (2026-11-01).
 * All events from the previous month are deleted.
 * 
 * @param today Reference date (defaults to current date)
 * @returns Cutoff date string in 'YYYY-MM-DD' format
 */
export function computeCutoffDate(today: Date | string = new Date()): string {
  const { year, month } = parseDateParts(today);

  // Determine the day of week for the 1st of this month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Using UTC calculations avoids any DST/local timezone shifts
  const firstOfMonthUtc = new Date(Date.UTC(year, month, 1));
  const dayOfWeek = firstOfMonthUtc.getUTCDay();

  // The Sunday on or before the 1st:
  // If 1st is Sunday (dayOfWeek === 0) -> 1 - 0 = 1 (1st of the month)
  // If 1st is Wednesday (dayOfWeek === 3) -> 1 - 3 = -2 (3 days before 1st)
  const cutoffUtc = new Date(Date.UTC(year, month, 1 - dayOfWeek));

  return formatDateString(
    cutoffUtc.getUTCFullYear(),
    cutoffUtc.getUTCMonth() + 1,
    cutoffUtc.getUTCDate(),
  );
}

/**
 * MONTH-END CLEANUP:
 * Deletes all events from the previous month EXCEPT events that fall inside
 * the week that straddles the month boundary.
 * 
 * - Idempotent: Can be run multiple times safely.
 * - Pure function variant that operates on an in-memory event array.
 * 
 * @param today Reference date (defaults to current date)
 * @param events List of calendar events
 * @returns Object with kept events, deleted events, and the cutoff date used
 */
export function cleanupOldMonth(
  today: Date | string = new Date(),
  events: CalendarEvent[] = [],
): { kept: CalendarEvent[]; deleted: CalendarEvent[]; cutoff: string } {
  const cutoff = computeCutoffDate(today);

  const kept: CalendarEvent[] = [];
  const deleted: CalendarEvent[] = [];

  for (const event of events) {
    // Dates are ISO 'YYYY-MM-DD', so standard string comparison works accurately
    if (event.date < cutoff) {
      deleted.push(event);
    } else {
      kept.push(event);
    }
  }

  return { kept, deleted, cutoff };
}
