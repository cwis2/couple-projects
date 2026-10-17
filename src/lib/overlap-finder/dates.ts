import type { CalendarEvent, DayInfo, WeekRange, WeekTarget } from "./types";
import { formatDateString } from "./cleanup";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORTS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Returns the 7 days (Sunday to Saturday) for either 'this_week' or 'next_week'
 */
export function getWeekRange(target: WeekTarget, referenceDate: Date = new Date()): WeekRange {
  // Normalize referenceDate
  const current = new Date(referenceDate.getTime());
  const dow = current.getDay(); // 0 = Sunday

  // Sunday of this week:
  const thisSunday = new Date(current);
  thisSunday.setDate(current.getDate() - dow);
  thisSunday.setHours(0, 0, 0, 0);

  // If next week requested, add 7 days
  const baseSunday = new Date(thisSunday);
  if (target === "next_week") {
    baseSunday.setDate(baseSunday.getDate() + 7);
  }

  const days: DayInfo[] = [];
  const todayStr = formatDateString(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    referenceDate.getDate(),
  );

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(baseSunday);
    dayDate.setDate(baseSunday.getDate() + i);

    const year = dayDate.getFullYear();
    const month = dayDate.getMonth() + 1;
    const dayNumber = dayDate.getDate();
    const dateStr = formatDateString(year, month, dayNumber);

    days.push({
      date: dateStr,
      dayName: DAY_NAMES[i],
      dayShort: DAY_SHORTS[i],
      dayNumber,
      month,
      year,
      isToday: dateStr === todayStr,
      isSunday: i === 0,
      isSaturday: i === 6,
    });
  }

  const startDay = days[0];
  const endDay = days[6];

  const formattedRange = `${MONTH_NAMES[startDay.month - 1]} ${startDay.dayNumber} – ${
    startDay.month === endDay.month ? "" : MONTH_NAMES[endDay.month - 1] + " "
  }${endDay.dayNumber}, ${endDay.year}`;

  return {
    target,
    title: target === "next_week" ? "Schedule Next Week" : "Change This Week",
    startDate: startDay.date,
    endDate: endDay.date,
    formattedRange,
    days,
  };
}

export interface OverlapMatch {
  event1: CalendarEvent;
  event2: CalendarEvent;
  overlapStart: string;
  overlapEnd: string;
}

/**
 * Detects overlapping events within a list of events on a specific day
 */
export function detectDayOverlaps(events: CalendarEvent[]): OverlapMatch[] {
  const overlaps: OverlapMatch[] = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i];
      const e2 = events[j];

      if (e1.date !== e2.date) continue;

      // Check time overlap: start1 < end2 && start2 < end1
      if (e1.start_time < e2.end_time && e2.start_time < e1.end_time) {
        const overlapStart = e1.start_time > e2.start_time ? e1.start_time : e2.start_time;
        const overlapEnd = e1.end_time < e2.end_time ? e1.end_time : e2.end_time;

        overlaps.push({
          event1: e1,
          event2: e2,
          overlapStart,
          overlapEnd,
        });
      }
    }
  }

  return overlaps;
}
