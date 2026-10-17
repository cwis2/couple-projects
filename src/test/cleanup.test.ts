import { describe, expect, it } from "vitest";
import { computeCutoffDate, cleanupOldMonth } from "../lib/overlap-finder/cleanup";
import type { CalendarEvent } from "../lib/overlap-finder/types";

describe("Monthly Cleanup Logic (cleanupOldMonth)", () => {
  it("covers the Oct 29 to Nov 4 example (with today = Nov 1, Oct 28 deleted, Oct 29 on kept)", () => {
    // Nov 1, 2023 was a Wednesday.
    // The straddling week runs Sunday Oct 29 to Saturday Nov 4.
    // Cutoff should be the Sunday on or before Nov 1 -> 2023-10-29.
    const today = "2023-11-01";
    const cutoff = computeCutoffDate(today);

    expect(cutoff).toBe("2023-10-29");

    const events: CalendarEvent[] = [
      {
        id: "1",
        date: "2023-10-27",
        start_time: "10:00",
        end_time: "11:00",
        title: "Old event Oct 27",
      },
      {
        id: "2",
        date: "2023-10-28",
        start_time: "14:00",
        end_time: "15:00",
        title: "Day before straddling week",
      },
      {
        id: "3",
        date: "2023-10-29",
        start_time: "09:00",
        end_time: "10:00",
        title: "Sunday of straddling week (Oct 29)",
      },
      {
        id: "4",
        date: "2023-10-31",
        start_time: "18:00",
        end_time: "19:00",
        title: "Halloween (Tuesday)",
      },
      {
        id: "5",
        date: "2023-11-01",
        start_time: "12:00",
        end_time: "13:00",
        title: "Nov 1st",
      },
      {
        id: "6",
        date: "2023-11-04",
        start_time: "20:00",
        end_time: "21:00",
        title: "Saturday of straddling week",
      },
    ];

    const result = cleanupOldMonth(today, events);

    expect(result.cutoff).toBe("2023-10-29");
    expect(result.deleted.map((e) => e.date)).toEqual(["2023-10-27", "2023-10-28"]);
    expect(result.kept.map((e) => e.date)).toEqual([
      "2023-10-29",
      "2023-10-31",
      "2023-11-01",
      "2023-11-04",
    ]);
  });

  it("deletes all previous month events when the 1st is a Sunday", () => {
    // Nov 1, 2026 is a Sunday.
    // Sunday on or before Nov 1 is Nov 1 itself.
    // Entire October should be deleted.
    const today = "2026-11-01";
    const cutoff = computeCutoffDate(today);

    expect(cutoff).toBe("2026-11-01");

    const events: CalendarEvent[] = [
      {
        id: "1",
        date: "2026-10-31",
        start_time: "12:00",
        end_time: "13:00",
        title: "Saturday Oct 31 (previous month)",
      },
      {
        id: "2",
        date: "2026-11-01",
        start_time: "10:00",
        end_time: "11:00",
        title: "Sunday Nov 1 (new month)",
      },
    ];

    const result = cleanupOldMonth(today, events);

    expect(result.deleted.map((e) => e.id)).toEqual(["1"]);
    expect(result.kept.map((e) => e.id)).toEqual(["2"]);
  });

  it("is idempotent: running multiple times preserves the kept events", () => {
    const today = "2023-11-01";
    const events: CalendarEvent[] = [
      { id: "1", date: "2023-10-28", start_time: "10:00", end_time: "11:00", title: "Oct 28" },
      { id: "2", date: "2023-10-29", start_time: "10:00", end_time: "11:00", title: "Oct 29" },
      { id: "3", date: "2023-11-02", start_time: "10:00", end_time: "11:00", title: "Nov 2" },
    ];

    const run1 = cleanupOldMonth(today, events);
    expect(run1.deleted.length).toBe(1);
    expect(run1.kept.length).toBe(2);

    // Run again with the kept events
    const run2 = cleanupOldMonth(today, run1.kept);
    expect(run2.deleted.length).toBe(0);
    expect(run2.kept.length).toBe(2);

    // Run a 3rd time later in the month (e.g. Nov 15)
    const run3 = cleanupOldMonth("2023-11-15", run2.kept);
    expect(run3.deleted.length).toBe(0);
    expect(run3.kept.length).toBe(2);
  });

  it("calculates 7-day Sunday-Saturday week range correctly", async () => {
    const { getWeekRange } = await import("../lib/overlap-finder/dates");
    // Oct 17, 2026 is Saturday
    const ref = new Date("2026-10-17T12:00:00Z");
    const thisWeek = getWeekRange("this_week", ref);

    expect(thisWeek.days.length).toBe(7);
    expect(thisWeek.days[0].dayName).toBe("Sunday");
    expect(thisWeek.days[6].dayName).toBe("Saturday");
    expect(thisWeek.startDate).toBe("2026-10-11");
    expect(thisWeek.endDate).toBe("2026-10-17");

    const nextWeek = getWeekRange("next_week", ref);
    expect(nextWeek.startDate).toBe("2026-10-18");
    expect(nextWeek.endDate).toBe("2026-10-24");
  });

  it("detects time overlaps correctly", async () => {
    const { detectDayOverlaps } = await import("../lib/overlap-finder/dates");
    const events: CalendarEvent[] = [
      { id: "1", date: "2026-10-17", start_time: "10:00", end_time: "12:00", title: "Morning shift" },
      { id: "2", date: "2026-10-17", start_time: "11:30", end_time: "13:00", title: "Lunch hangout" },
      { id: "3", date: "2026-10-17", start_time: "14:00", end_time: "15:00", title: "Afternoon gym" },
    ];

    const overlaps = detectDayOverlaps(events);
    expect(overlaps.length).toBe(1);
    expect(overlaps[0].overlapStart).toBe("11:30");
    expect(overlaps[0].overlapEnd).toBe("12:00");
  });
});

