import { useMemo } from "react";
import type { CalendarEvent } from "../../lib/overlap-finder/types";
import { formatDateString } from "../../lib/overlap-finder/cleanup";

interface MonthCalendarProps {
  currentDate?: Date;
  events?: CalendarEvent[];
}

export function MonthCalendar({ currentDate = new Date(), events = [] }: MonthCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Format header like "10 / 2026"
  const headerText = `${String(month + 1).padStart(2, "0")} / ${year}`;

  const todayStr = formatDateString(year, month + 1, currentDate.getDate());

  // Set of dates with events for instant lookup
  const eventDatesSet = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.date));
    return set;
  }, [events]);

  // Calendar cells generation (Sunday to Saturday)
  const calendarCells = useMemo(() => {
    // 1st of month
    const firstDay = new Date(year, month, 1);
    const startDow = firstDay.getDay(); // 0 = Sun, 1 = Mon, ...

    // Days in this month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Days in previous month for padding
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isSunday: boolean;
      isSaturday: boolean;
      isToday: boolean;
      hasEvents: boolean;
    }> = [];

    // Prev month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = formatDateString(
        prevDate.getFullYear(),
        prevDate.getMonth() + 1,
        dayNum,
      );
      const dow = prevDate.getDay();
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isToday: dateStr === todayStr,
        hasEvents: eventDatesSet.has(dateStr),
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = formatDateString(year, month + 1, dayNum);
      const cellDate = new Date(year, month, dayNum);
      const dow = cellDate.getDay();
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isToday: dateStr === todayStr,
        hasEvents: eventDatesSet.has(dateStr),
      });
    }

    // Next month padding to fill out 35 or 42 cells
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = formatDateString(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        dayNum,
      );
      const dow = nextDate.getDay();
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isToday: dateStr === todayStr,
        hasEvents: eventDatesSet.has(dateStr),
      });
    }

    return cells;
  }, [year, month, todayStr, eventDatesSet]);

  return (
    <div className="ds-calendar-card">
      <div className="ds-calendar-header">
        <span className="ds-calendar-title">📅 {headerText}</span>
        <span style={{ fontFamily: "var(--ds-font-pixel)", fontSize: "11px", color: "var(--ds-screen-text-dim)" }}>
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="ds-calendar-grid">
        {/* Column Headers */}
        <div className="ds-cal-head sun">SUN</div>
        <div className="ds-cal-head mid">MON</div>
        <div className="ds-cal-head mid">TUE</div>
        <div className="ds-cal-head mid">WED</div>
        <div className="ds-cal-head mid">THU</div>
        <div className="ds-cal-head mid">FRI</div>
        <div className="ds-cal-head sat">SAT</div>

        {/* Date Cells */}
        {calendarCells.map((cell, idx) => {
          let cellClass = "ds-cal-cell";
          if (!cell.isCurrentMonth) cellClass += " dim";
          if (cell.isSunday) cellClass += " sun";
          if (cell.isSaturday) cellClass += " sat";
          if (cell.isToday) cellClass += " today";

          return (
            <div key={`${cell.dateStr}-${idx}`} className={cellClass} title={cell.dateStr}>
              <span>{cell.dayNum}</span>
              {cell.hasEvents && <div className="ds-event-dot" title="Has scheduled events" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
