import { useState, useCallback } from "react";
import { DSHeader, DSBottomBar } from "./DSChrome";
import { FilterPanel } from "./FilterPanel";
import { emptyFilters, type FilterState } from "../../lib/date-randomizer/types";
import type { DateIdea } from "../../lib/date-randomizer/types";
import { saveDate } from "../../lib/date-randomizer/db";

interface AddDateScreenProps {
  onBack: () => void;
  onSaved: (date: DateIdea) => void;
  currentUserId: string;
}

export function AddDateScreen({ onBack, onSaved, currentUserId }: AddDateScreenProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => {
    const f = emptyFilters();
    f.who_added = currentUserId;
    return f;
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const saved = await saveDate({
        name: name.trim(),
        description: description.trim(),
        time_required: filters.time_required,
        energy_level: filters.energy_level,
        focus_required: filters.focus_required,
        preparation_required: filters.preparation_required,
        vibe: filters.vibe.length > 0 ? filters.vibe : null,
        activity_type: filters.activity_type.length > 0 ? filters.activity_type : null,
        who_added: currentUserId,
      });
      setToast("Date saved");
      setTimeout(() => {
        onSaved(saved);
      }, 900);
    } catch (err) {
      console.error("Failed to save date:", err);
      setToast("Save failed");
      setTimeout(() => setToast(null), 1500);
    } finally {
      setSaving(false);
    }
  }, [name, description, filters, currentUserId, onSaved]);

  return (
    <>
      <DSHeader title="Add Date" />
      <div className="dr-content">
        <div className="dr-scroll-area dr-screen-enter">
          {/* Name */}
          <div className="dr-form-group">
            <label className="dr-form-label" htmlFor="dr-add-name">
              Name *
            </label>
            <input
              id="dr-add-name"
              className="dr-input"
              type="text"
              placeholder="Movie night, cooking together..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="dr-form-group">
            <label className="dr-form-label" htmlFor="dr-add-desc">
              Description
            </label>
            <textarea
              id="dr-add-desc"
              className="dr-input dr-textarea"
              placeholder="Optional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Collapsible Filters */}
          <div className="dr-filter-section">
            <button
              type="button"
              className={`dr-filter-toggle-btn ${filtersOpen ? "open" : ""}`}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <span className={`dr-filter-toggle-arrow ${filtersOpen ? "open" : ""}`}>▼</span>
              {filtersOpen ? "Hide Filters" : "Add Filters"}
            </button>
            {filtersOpen && <FilterPanel filters={filters} onChange={setFilters} excludeCategories={["who_added"]} />}
          </div>
        </div>

        {/* Toast */}
        {toast && <div className="dr-toast">{toast}</div>}
      </div>
      <DSBottomBar
        onBack={onBack}
        onOk={name.trim() ? handleSave : undefined}
        okLabel={saving ? "Saving..." : "OK"}
      />
    </>
  );
}
