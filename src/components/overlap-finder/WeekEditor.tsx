import { useState, useMemo, useCallback, useEffect } from "react";
import type { CalendarEvent, WeekTarget } from "../../lib/overlap-finder/types";
import { getWeekRange, detectDayOverlaps } from "../../lib/overlap-finder/dates";
import { EventModal } from "./EventModal";

interface WeekEditorProps {
  target: WeekTarget;
  events: CalendarEvent[];
  onSaveEvent: (eventData: Omit<CalendarEvent, "id" | "created_at"> & { id?: string }) => void;
  onDeleteEvent: (id: string) => void;
  onBack: () => void;
  currentDate?: Date;
  currentUserId?: string;
}

export function WeekEditor({
  target,
  events,
  onSaveEvent,
  onDeleteEvent,
  onBack,
  currentDate = new Date(),
  currentUserId = "cwis",
}: WeekEditorProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    initialDate?: string;
    eventToEdit?: CalendarEvent | null;
  }>({
    isOpen: false,
    initialDate: undefined,
    eventToEdit: null,
  });

  const weekInfo = useMemo(() => {
    return getWeekRange(target, currentDate);
  }, [target, currentDate]);

  // Group events by date for this week
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    weekInfo.days.forEach((day) => map.set(day.date, []));

    events.forEach((evt) => {
      if (map.has(evt.date)) {
        map.get(evt.date)?.push(evt);
      }
    });

    // Sort events by start time
    map.forEach((list) => {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return map;
  }, [events, weekInfo]);

  // Handle back button with screen-wipe animation
  const handleBackClick = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onBack();
    }, 280); // matches --ds-wipe-duration
  }, [onBack]);

  useEffect(() => {
    if (modalState.isOpen) return;

    const handleBackKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Escape") return;
      event.preventDefault();
      handleBackClick();
    };

    window.addEventListener("keydown", handleBackKey);
    return () => window.removeEventListener("keydown", handleBackKey);
  }, [handleBackClick, modalState.isOpen]);

  const openAddModal = (dateStr?: string) => {
    setModalState({
      isOpen: true,
      initialDate: dateStr || weekInfo.startDate,
      eventToEdit: null,
    });
  };

  const openEditModal = (event: CalendarEvent) => {
    setModalState({
      isOpen: true,
      initialDate: event.date,
      eventToEdit: event,
    });
  };

  return (
    <div className={`ds-screen ds-screen-bottom ds-editor-view ${isClosing ? "closing" : ""}`}>
      {/* Top Bar with Back Button & Week Summary */}
      <div className="ds-editor-header">
        <button
          type="button"
          className="ds-btn-back"
          onClick={handleBackClick}
          title="Return to Home Menu"
        >
          <span>◀</span> Back
        </button>

        <span className="ds-editor-title">
          {weekInfo.title} ({weekInfo.formattedRange})
        </span>

        <button
          type="button"
          className="ds-btn-add"
          onClick={() => openAddModal()}
          title="Add New Event"
        >
          + Add
        </button>
      </div>

      {/* 7 Days Columns (Sunday to Saturday) */}
      <div className="ds-editor-days-grid">
        {weekInfo.days.map((day) => {
          const dayEvents = eventsByDate.get(day.date) || [];
          const overlaps = detectDayOverlaps(dayEvents);

          let colClass = "ds-day-col";
          if (day.isSunday) colClass += " sun";
          if (day.isSaturday) colClass += " sat";
          if (day.isToday) colClass += " today";

          return (
            <div key={day.date} className={colClass}>
              {/* Day Header */}
              <div className={`ds-day-head ${day.isSunday ? "sun" : day.isSaturday ? "sat" : ""}`}>
                <div className="ds-day-head-name">{day.dayShort}</div>
                <div className="ds-day-head-date">
                  {day.month}/{day.dayNumber} {day.isToday && "· Today"}
                </div>
              </div>

              {/* Day Events List */}
              <div className="ds-day-events-list">
                {/* Overlap alert badge if any events clash on this day */}
                {overlaps.length > 0 && (
                  <div className="ds-overlap-badge" title="Overlapping events detected">
                    <span>⚡ Overlap ({overlaps[0].overlapStart} - {overlaps[0].overlapEnd})</span>
                  </div>
                )}

                {dayEvents.length === 0 ? (
                  <div
                    style={{
                      fontFamily: "var(--ds-font-body)",
                      fontSize: "10px",
                      color: "var(--ds-screen-text-dim)",
                      textAlign: "center",
                      padding: "10px 0",
                    }}
                  >
                    No events
                  </div>
                ) : (
                  dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="ds-event-card"
                      style={{ borderLeftColor: evt.color || "var(--ds-tag-pink)" }}
                      onClick={() => openEditModal(evt)}
                      title={`Edit: ${evt.title} (${evt.start_time} - ${evt.end_time})`}
                    >
                      <div className="ds-event-card-title">{evt.title}</div>
                      <div className="ds-event-card-time">
                        {evt.start_time} - {evt.end_time}
                      </div>
                      {evt.note && (
                        <div
                          style={{
                            fontSize: "9px",
                            color: "var(--ds-screen-text-dim)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📝 {evt.note}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add button on each day column */}
              <button
                type="button"
                className="ds-day-add-btn"
                onClick={() => openAddModal(day.date)}
              >
                + Add
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer strip showing editing week range */}
      <div className="ds-footer-strip">
        <span>Week: {weekInfo.startDate} to {weekInfo.endDate}</span>
        <span>{events.length} event{events.length === 1 ? "" : "s"} ({currentUserId})</span>
      </div>

      {/* Modal for Adding / Editing Event */}
      {modalState.isOpen && (
        <EventModal
          initialDate={modalState.initialDate}
          initialEvent={modalState.eventToEdit}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onClose={() => setModalState({ isOpen: false, eventToEdit: null })}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
