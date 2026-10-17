import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "../../apps";
import type { CalendarEvent, WeekTarget } from "../../lib/overlap-finder/types";
import {
  getEvents,
  saveEvent,
  deleteEvent,
  subscribeToEvents,
  runStartupCleanup,
} from "../../lib/overlap-finder/db";
import { TopScreen } from "./TopScreen";
import { HomeMenu } from "./HomeMenu";
import { WeekEditor } from "./WeekEditor";
import "./ds-theme.css";

export function OverlapFinderApp({ user }: AppProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeWeekTarget, setActiveWeekTarget] = useState<WeekTarget | null>(null);
  const [isWiping, setIsWiping] = useState(true);
  const [currentDate] = useState(() => new Date());

  const currentUserId = user?.id || "cwis";

  // Startup: run fallback monthly cleanup and load events specifically for active user
  useEffect(() => {
    // 1. Startup screen wipe animation
    const wipeTimer = setTimeout(() => {
      setIsWiping(false);
    }, 450);

    // 2. Run monthly cleanup fallback check specifically for active user
    runStartupCleanup(currentDate, currentUserId).then(({ cutoff, deletedCount }) => {
      if (deletedCount > 0) {
        console.log(`[OverlapFinder] Startup cleanup removed ${deletedCount} events before ${cutoff} for user ${currentUserId}`);
      }
    });

    // 3. Load and periodically refresh events for the active user so changes
    // made from another device appear without reopening the app.
    let isMounted = true;
    const refreshEvents = () => {
      getEvents(currentUserId).then((latest) => {
        if (isMounted) setEvents(latest);
      });
    };
    refreshEvents();
    const syncInterval = window.setInterval(refreshEvents, 15_000);
    window.addEventListener("focus", refreshEvents);

    // 4. Subscribe to updates specifically for active user
    const unsubscribe = subscribeToEvents((updated) => {
      setEvents(updated);
    }, currentUserId);

    return () => {
      clearTimeout(wipeTimer);
      isMounted = false;
      window.clearInterval(syncInterval);
      window.removeEventListener("focus", refreshEvents);
      unsubscribe();
    };
  }, [currentDate, currentUserId]);

  // Open week editor when a tile is tapped
  const handleSelectWeek = useCallback((target: WeekTarget) => {
    setActiveWeekTarget(target);
  }, []);

  // Return to home menu
  const handleBackToHome = useCallback(() => {
    setActiveWeekTarget(null);
  }, []);

  // Immediate save specifically for active user
  const handleSaveEvent = useCallback(
    async (eventData: Omit<CalendarEvent, "id" | "created_at"> & { id?: string }) => {
      await saveEvent(
        {
          ...eventData,
          user_id: currentUserId,
        },
        currentUserId,
      );
    },
    [currentUserId],
  );

  // Immediate delete specifically for active user
  const handleDeleteEvent = useCallback(
    async (id: string) => {
      await deleteEvent(id, currentUserId);
    },
    [currentUserId],
  );

  return (
    <div className="ds-app-viewport">
      <div className={`ds-shell ${isWiping ? "ds-startup-wipe" : ""}`}>
        {/* ================= TOP SCREEN BEZEL ================= */}
        <div className="ds-bezel">
          <TopScreen currentDate={currentDate} events={events} userName={user?.name || currentUserId} />
        </div>

        {/* ================= HINGE SECTION ================= */}
        <div className="ds-hinge">
          <div className="ds-hinge-bar" />
          <div className="ds-hinge-speaker">
            <span className="ds-hinge-hole" />
            <span className="ds-hinge-hole" />
            <span className="ds-hinge-hole" />
          </div>
          <div style={{ zIndex: 2, fontFamily: "var(--ds-font-pixel)", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
            DUAL SCREEN SYSTEM · USER: {user?.name?.toUpperCase() || "PLAYER"}
          </div>
          <div className="ds-hinge-speaker">
            <span className="ds-hinge-hole" />
            <span className="ds-hinge-hole" />
            <span className="ds-hinge-hole" />
          </div>
        </div>

        {/* ================= BOTTOM SCREEN BEZEL ================= */}
        <div className="ds-bezel">
          {activeWeekTarget ? (
            <WeekEditor
              target={activeWeekTarget}
              events={events}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
              onBack={handleBackToHome}
              currentDate={currentDate}
              currentUserId={user?.id}
            />
          ) : (
            <HomeMenu
              onSelectWeek={handleSelectWeek}
              currentDate={currentDate}
            />
          )}
        </div>
      </div>
      <aside className="ds-control-legend" aria-label="Overlap Finder controls">
        <h2>Controls</h2>
        <ul>
          <li><kbd>↑ ↓ ← →</kbd><span>Move selection</span></li>
          <li><kbd>Click / Enter</kbd><span>Select</span></li>
          <li><kbd>Backspace</kbd><span>Go back</span></li>
          <li><kbd>Esc</kbd><span>Return to home</span></li>
        </ul>
      </aside>
    </div>
  );
}

export default OverlapFinderApp;
