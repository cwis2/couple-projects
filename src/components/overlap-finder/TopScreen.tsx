import type { CalendarEvent } from "../../lib/overlap-finder/types";
import { AnalogClock } from "./AnalogClock";
import { MonthCalendar } from "./MonthCalendar";

interface TopScreenProps {
  currentDate?: Date;
  events?: CalendarEvent[];
  userName?: string;
}

export function TopScreen({ currentDate = new Date(), events = [], userName }: TopScreenProps) {
  const formattedToday = currentDate.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="ds-screen ds-screen-top">
      {/* Top read-only dashboard status strip */}
      <div className="ds-status-strip">
        <span>📶 {userName ? `${userName.toUpperCase()}'S CALENDAR` : "HANDHELD ONLINE"}</span>
        <span>{formattedToday}</span>
        <span>🔋 100%</span>
      </div>

      {/* Main dashboard content: Clock (left) + Calendar (right) */}
      <div className="ds-dashboard">
        <AnalogClock />
        <MonthCalendar currentDate={currentDate} events={events} />
      </div>
    </div>
  );
}
