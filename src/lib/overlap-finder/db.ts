import type { CalendarEvent } from "./types";
import { computeCutoffDate, cleanupOldMonth } from "./cleanup";

export const STORAGE_PREFIX = "couple_projects_ds_events_v1";

// Starter sample events for demo & testing if storage is empty
export const INITIAL_SAMPLE_EVENTS: CalendarEvent[] = [
  {
    id: "evt-init-1",
    date: "2026-10-17",
    start_time: "10:00",
    end_time: "11:30",
    title: "Coffee & Catchup",
    note: "Review weekly plans together",
    color: "#f43f5e",
    user_id: "cwis",
    created_at: new Date().toISOString(),
  },
  {
    id: "evt-init-2",
    date: "2026-10-17",
    start_time: "11:00",
    end_time: "12:30",
    title: "Grocery Run",
    note: "Get dinner ingredients",
    color: "#0284c7",
    user_id: "monokork",
    created_at: new Date().toISOString(),
  },
  {
    id: "evt-init-3",
    date: "2026-10-19",
    start_time: "14:00",
    end_time: "15:30",
    title: "Movie Night Prep",
    note: "Pick cozy films",
    color: "#8b5cf6",
    user_id: "cwis",
    created_at: new Date().toISOString(),
  },
  {
    id: "evt-init-4",
    date: "2026-10-21",
    start_time: "18:00",
    end_time: "20:00",
    title: "Dinner Date",
    note: "Table booked for 6:15 PM",
    color: "#f43f5e",
    user_id: "cwis",
    created_at: new Date().toISOString(),
  },
  {
    id: "evt-init-5",
    date: "2026-10-23",
    start_time: "16:00",
    end_time: "17:30",
    title: "Gym Session",
    note: "Leg day + stretching",
    color: "#10b981",
    user_id: "monokork",
    created_at: new Date().toISOString(),
  },
];

export type EventListener = (events: CalendarEvent[]) => void;

interface RegisteredListener {
  callback: EventListener;
  userId?: string | null;
}

const listeners = new Set<RegisteredListener>();

export function getUserStorageKey(userId?: string | null): string {
  if (userId) {
    return `${STORAGE_PREFIX}_${userId.toLowerCase()}`;
  }
  return STORAGE_PREFIX;
}

function notifyListeners(events: CalendarEvent[], targetUserId?: string | null) {
  const normTarget = targetUserId ? targetUserId.toLowerCase() : null;

  listeners.forEach(({ callback, userId }) => {
    try {
      if (userId) {
        if (normTarget && normTarget !== userId) {
          return;
        }
        const userEvents = events.filter((e) => (e.user_id || "cwis").toLowerCase() === userId);
        callback(userEvents);
      } else {
        callback(events);
      }
    } catch (err) {
      console.error("Error in event listener:", err);
    }
  });
}

/**
 * Checks if Supabase credentials are configured in environment
 */
function getSupabaseConfig(): { url: string; key: string } | null {
  const url =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof window !== "undefined" && (window as unknown as { __SUPABASE_URL__?: string }).__SUPABASE_URL__);
  const key =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && (window as unknown as { __SUPABASE_ANON_KEY__?: string }).__SUPABASE_ANON_KEY__);

  if (url && key) {
    return { url, key };
  }
  return null;
}

/**
 * Reads events from local cache, partitioned by user
 */
export function readLocalEvents(userId?: string | null): CalendarEvent[] {
  const normUser = userId ? userId.toLowerCase() : null;

  if (typeof window === "undefined" || !window.localStorage) {
    if (normUser) {
      return INITIAL_SAMPLE_EVENTS.filter((e) => (e.user_id || "cwis").toLowerCase() === normUser);
    }
    return [...INITIAL_SAMPLE_EVENTS];
  }

  if (normUser) {
    const userKey = getUserStorageKey(normUser);
    const userRaw = window.localStorage.getItem(userKey);

    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((e) => !e.user_id || e.user_id.toLowerCase() === normUser)
            .map((e) => ({ ...e, user_id: normUser }));
        }
      } catch (err) {
        console.error(`Failed to parse stored events for ${normUser}:`, err);
      }
    }

    // Check legacy storage key for migration if userKey was not found
    const legacyRaw = window.localStorage.getItem(STORAGE_PREFIX);
    if (legacyRaw) {
      try {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          const userEvents = legacyParsed
            .filter((e) => (e.user_id ? e.user_id.toLowerCase() === normUser : normUser === "cwis"))
            .map((e) => ({ ...e, user_id: normUser }));

          if (userEvents.length > 0) {
            window.localStorage.setItem(userKey, JSON.stringify(userEvents));
            return userEvents;
          }
        }
      } catch (err) {
        console.error("Failed to parse legacy events:", err);
      }
    }

    // Fallback: seed from INITIAL_SAMPLE_EVENTS for this user
    const seed = INITIAL_SAMPLE_EVENTS.filter((e) => (e.user_id || "cwis").toLowerCase() === normUser);
    window.localStorage.setItem(userKey, JSON.stringify(seed));
    return seed;
  }

  // If no userId, read all known users
  const cwis = readLocalEvents("cwis");
  const monokork = readLocalEvents("monokork");
  return [...cwis, ...monokork];
}

/**
 * Writes events to local cache for a user
 */
export function writeLocalEvents(events: CalendarEvent[], userId?: string | null): void {
  const normUser = userId ? userId.toLowerCase() : null;

  if (typeof window !== "undefined" && window.localStorage) {
    if (normUser) {
      const userEvents = events.map((e) => ({ ...e, user_id: normUser }));
      window.localStorage.setItem(getUserStorageKey(normUser), JSON.stringify(userEvents));
    } else {
      const byUser = new Map<string, CalendarEvent[]>();
      events.forEach((evt) => {
        const u = (evt.user_id || "cwis").toLowerCase();
        if (!byUser.has(u)) byUser.set(u, []);
        byUser.get(u)!.push({ ...evt, user_id: u });
      });
      byUser.forEach((list, u) => {
        window.localStorage.setItem(getUserStorageKey(u), JSON.stringify(list));
      });
      window.localStorage.setItem(STORAGE_PREFIX, JSON.stringify(events));
    }
  }

  notifyListeners(events, normUser);
}

/**
 * Subscribes to event store changes for a specific user or globally
 */
export function subscribeToEvents(listener: EventListener, userId?: string | null): () => void {
  const reg: RegisteredListener = { callback: listener, userId: userId ? userId.toLowerCase() : null };
  listeners.add(reg);
  return () => {
    listeners.delete(reg);
  };
}

export interface GetEventsFilter {
  startDate?: string;
  endDate?: string;
  userId?: string | null;
}

/**
 * Fetches events, filtered by user specifically, and optionally date range
 */
export async function getEvents(
  filterOrStartDate?: string | GetEventsFilter,
  endDateParam?: string,
  userIdParam?: string | null,
): Promise<CalendarEvent[]> {
  let startDate: string | undefined;
  let endDate: string | undefined;
  let userId: string | undefined;

  if (typeof filterOrStartDate === "object" && filterOrStartDate !== null) {
    startDate = filterOrStartDate.startDate;
    endDate = filterOrStartDate.endDate;
    userId = filterOrStartDate.userId ? filterOrStartDate.userId.toLowerCase() : undefined;
  } else if (typeof filterOrStartDate === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(filterOrStartDate)) {
      startDate = filterOrStartDate;
      endDate = endDateParam;
      userId = userIdParam ? userIdParam.toLowerCase() : undefined;
    } else {
      userId = filterOrStartDate.toLowerCase();
      startDate = endDateParam;
      endDate = userIdParam || undefined;
    }
  }

  const sb = getSupabaseConfig();

  if (sb) {
    try {
      let query = `${sb.url}/rest/v1/events?select=*&order=date.asc,start_time.asc`;
      if (userId) query += `&user_id=eq.${userId}`;
      if (startDate) query += `&date=gte.${startDate}`;
      if (endDate) query += `&date=lte.${endDate}`;

      const res = await fetch(query, {
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data: CalendarEvent[] = await res.json();
        // Update local cache sync
        if (userId) {
          writeLocalEvents(data, userId);
        } else {
          writeLocalEvents(data);
        }
        return data;
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local storage:", err);
    }
  }

  // Fallback to local storage
  let events = readLocalEvents(userId);
  if (startDate) events = events.filter((e) => e.date >= startDate);
  if (endDate) events = events.filter((e) => e.date <= endDate);
  return events;
}

/**
 * Creates or updates an event immediately in the database for a specific user
 */
export async function saveEvent(
  eventData: Omit<CalendarEvent, "id" | "created_at"> & { id?: string },
  currentUserId?: string | null,
): Promise<CalendarEvent> {
  const targetUser = (eventData.user_id || currentUserId || "cwis").toLowerCase();
  const now = new Date().toISOString();
  const id = eventData.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fullEvent: CalendarEvent = {
    ...eventData,
    id,
    user_id: targetUser,
    created_at: eventData.id ? undefined : now,
  };

  const sb = getSupabaseConfig();
  if (sb) {
    try {
      const res = await fetch(`${sb.url}/rest/v1/events`, {
        method: "POST",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(fullEvent),
      });

      if (res.ok) {
        const savedList = await res.json();
        if (savedList && savedList[0]) {
          const saved: CalendarEvent = {
            ...savedList[0],
            user_id: (savedList[0].user_id || targetUser).toLowerCase(),
          };
          const current = readLocalEvents(targetUser);
          const local = current.filter((e) => e.id !== saved.id);
          const updated = [...local, saved];
          writeLocalEvents(updated, targetUser);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase save failed, saving locally:", err);
    }
  }

  // Local storage save specifically for this user
  const current = readLocalEvents(targetUser);
  const existingIdx = current.findIndex((e) => e.id === id);
  let updatedList: CalendarEvent[];

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...current[existingIdx], ...fullEvent, user_id: targetUser };
  } else {
    updatedList = [...current, fullEvent];
  }

  writeLocalEvents(updatedList, targetUser);
  return fullEvent;
}

/**
 * Deletes an event immediately from the database and local storage for a user
 */
export async function deleteEvent(id: string, userId?: string | null): Promise<boolean> {
  const normUser = userId ? userId.toLowerCase() : undefined;
  const sb = getSupabaseConfig();

  if (sb) {
    try {
      let query = `${sb.url}/rest/v1/events?id=eq.${id}`;
      if (normUser) query += `&user_id=eq.${normUser}`;
      await fetch(query, {
        method: "DELETE",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
        },
      });
    } catch (err) {
      console.warn("Supabase delete failed, removing locally:", err);
    }
  }

  if (normUser) {
    const current = readLocalEvents(normUser);
    const filtered = current.filter((e) => e.id !== id);
    writeLocalEvents(filtered, normUser);
  } else {
    for (const u of ["cwis", "monokork"]) {
      const current = readLocalEvents(u);
      if (current.some((e) => e.id === id)) {
        writeLocalEvents(current.filter((e) => e.id !== id), u);
      }
    }
  }

  return true;
}

/**
 * Fallback check each time the app loads:
 * Cleans up old month events for the given user (or all users) if scheduled job didn't run.
 */
export async function runStartupCleanup(
  today: Date | string = new Date(),
  userId?: string | null,
): Promise<{
  cutoff: string;
  deletedCount: number;
}> {
  const normUser = userId ? userId.toLowerCase() : undefined;
  const cutoff = computeCutoffDate(today);
  const sb = getSupabaseConfig();

  let deletedCount = 0;

  if (sb) {
    try {
      let query = `${sb.url}/rest/v1/events?date=lt.${cutoff}`;
      if (normUser) query += `&user_id=eq.${normUser}`;
      const res = await fetch(query, {
        method: "DELETE",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          Prefer: "count=exact",
        },
      });
      if (res.ok) {
        const contentRange = res.headers.get("content-range");
        if (contentRange) {
          const parts = contentRange.split("/");
          deletedCount = parseInt(parts[1] || "0", 10);
        }
      }
    } catch (err) {
      console.warn("Supabase startup cleanup fallback failed:", err);
    }
  }

  // Clean local cache as well
  const usersToClean = normUser ? [normUser] : ["cwis", "monokork"];
  for (const u of usersToClean) {
    const current = readLocalEvents(u);
    const { kept, deleted } = cleanupOldMonth(today, current);
    if (deleted.length > 0) {
      writeLocalEvents(kept, u);
      deletedCount = Math.max(deletedCount, deleted.length);
    }
  }

  return { cutoff, deletedCount };
}
