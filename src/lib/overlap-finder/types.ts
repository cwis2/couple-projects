export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (24-hour)
  end_time: string; // HH:MM (24-hour)
  title: string;
  note?: string | null;
  color?: string; // hex or CSS color
  user_id?: string | null;
  created_at?: string; // ISO string
}

export type WeekTarget = "this_week" | "next_week";

export interface DayInfo {
  date: string; // YYYY-MM-DD
  dayName: string; // "Sunday", "Monday", etc.
  dayShort: string; // "SUN", "MON", etc.
  dayNumber: number; // 1 - 31
  month: number; // 1 - 12
  year: number;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
}

export interface WeekRange {
  target: WeekTarget;
  title: string;
  startDate: string; // YYYY-MM-DD (Sunday)
  endDate: string; // YYYY-MM-DD (Saturday)
  formattedRange: string; // "Oct 18 – Oct 24, 2026"
  days: DayInfo[];
}

export interface CleanupResult {
  cutoffDate: string; // YYYY-MM-DD
  deletedCount: number;
  deletedEvents: CalendarEvent[];
}
