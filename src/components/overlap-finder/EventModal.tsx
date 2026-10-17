import { useEffect, useState, type FormEvent } from "react";
import type { CalendarEvent } from "../../lib/overlap-finder/types";

interface EventModalProps {
  initialDate?: string;
  initialEvent?: CalendarEvent | null;
  onSave: (eventData: Omit<CalendarEvent, "id" | "created_at"> & { id?: string }) => void | Promise<void>;
  onDelete?: (id: string) => void;
  onClose: () => void;
  currentUserId?: string;
}

const PRESET_COLORS = [
  { label: "Pink", value: "#f43f5e" },
  { label: "Blue", value: "#0284c7" },
  { label: "Green", value: "#10b981" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Cyan", value: "#06b6d4" },
];

export function EventModal({
  initialDate,
  initialEvent,
  onSave,
  onDelete,
  onClose,
  currentUserId = "cwis",
}: EventModalProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [title, setTitle] = useState(initialEvent?.title || "");
  const [date, setDate] = useState(initialEvent?.date || initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(initialEvent?.start_time || "10:00");
  const [endTime, setEndTime] = useState(initialEvent?.end_time || "11:00");
  const [note, setNote] = useState(initialEvent?.note || "");
  const [color, setColor] = useState(initialEvent?.color || PRESET_COLORS[0].value);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeleteConfirmOpen) return;

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setIsDeleteConfirmOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isDeleteConfirmOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setSaveError(null);
    try {
      await onSave({
        id: initialEvent?.id,
        title: title.trim(),
        date,
        start_time: startTime,
        end_time: endTime,
        note: note.trim() || null,
        color,
        user_id: currentUserId,
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this event.");
    }
  };

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="ds-modal-title">
          <span>{initialEvent ? "Edit Event" : "New Event"} ({currentUserId})</span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Title */}
          <div className="ds-form-group">
            <label className="ds-form-label">Event Title</label>
            <input
              type="text"
              required
              className="ds-input"
              placeholder="e.g. Dinner Date, Work Shift"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="ds-form-group">
            <label className="ds-form-label">Date</label>
            <input
              type="date"
              required
              className="ds-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Time Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="ds-form-group">
              <label className="ds-form-label">Start Time</label>
              <input
                type="time"
                required
                className="ds-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="ds-form-group">
              <label className="ds-form-label">End Time</label>
              <input
                type="time"
                required
                className="ds-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Color Tag */}
          <div className="ds-form-group">
            <label className="ds-form-label">Color Tag</label>
            <div className="ds-color-palette">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  className={`ds-color-swatch ${color === c.value ? "selected" : ""}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(c.value)}
                />
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div className="ds-form-group">
            <label className="ds-form-label">Note (optional)</label>
            <textarea
              className="ds-input"
              rows={2}
              placeholder="Add details, location, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Actions */}
          {saveError && <p className="ds-save-error" role="alert">Save failed: {saveError}</p>}
          <div className="ds-modal-actions">
            <div>
              {initialEvent && onDelete && (
                <button
                  type="button"
                  className="ds-btn-delete"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  Delete
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="ds-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="ds-btn-save">
                Save Immediately
              </button>
            </div>
          </div>
        </form>
      </div>
      {isDeleteConfirmOpen && (
        <div className="ds-delete-confirm-backdrop" onClick={(event) => event.stopPropagation()}>
          <section
            className="ds-delete-confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ds-delete-confirm-title"
            aria-describedby="ds-delete-confirm-description"
          >
            <h2 id="ds-delete-confirm-title">Delete this event?</h2>
            <p id="ds-delete-confirm-description">
              “{initialEvent?.title}” will be permanently removed.
            </p>
            <div className="ds-delete-confirm-actions">
              <button
                type="button"
                className="ds-btn-cancel"
                onClick={() => setIsDeleteConfirmOpen(false)}
                autoFocus
              >
                Keep Event
              </button>
              <button
                type="button"
                className="ds-btn-delete"
                onClick={() => {
                  if (!initialEvent || !onDelete) return;
                  onDelete(initialEvent.id);
                  setIsDeleteConfirmOpen(false);
                  onClose();
                }}
              >
                Delete Event
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
