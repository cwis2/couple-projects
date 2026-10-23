import { useState, useMemo, useCallback } from "react";
import { Frown, Inbox, Pencil, Search, Trash2 } from "lucide-react";
import { DSHeader, DSBottomBar } from "./DSChrome";
import { FilterPanel } from "./FilterPanel";
import { emptyFilters, type FilterState, FILTER_CATEGORIES } from "../../lib/date-randomizer/types";
import type { DateIdea } from "../../lib/date-randomizer/types";
import { deleteDate, updateDate } from "../../lib/date-randomizer/db";

interface ViewDatesScreenProps {
  dates: DateIdea[];
  onBack: () => void;
  onDatesChanged: () => void;
}

type SubScreen = "list" | "detail" | "edit";

function matchesFilters(date: DateIdea, filters: FilterState, search: string): boolean {
  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    if (!date.name.toLowerCase().includes(q) && !date.description?.toLowerCase().includes(q)) {
      return false;
    }
  }

  for (const cat of FILTER_CATEGORIES) {
    const key = cat.key as keyof FilterState;
    const filterVal = filters[key];

    if (cat.multiSelect) {
      if ((filterVal as string[]).length === 0) continue;
    } else {
      if (filterVal === null) continue;
    }

    const dateVal = date[cat.key as keyof DateIdea];
    if (dateVal === null || dateVal === undefined) return false;

    if (cat.multiSelect) {
      const dateArr = Array.isArray(dateVal) ? dateVal : [];
      const filterArr = filterVal as string[];
      if (!filterArr.some((f) => dateArr.includes(f))) return false;
    } else {
      if (dateVal !== filterVal) return false;
    }
  }
  return true;
}

export function ViewDatesScreen({ dates, onBack, onDatesChanged }: ViewDatesScreenProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>("list");
  const [selectedDate, setSelectedDate] = useState<DateIdea | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFilters, setEditFilters] = useState<FilterState>(emptyFilters());

  const filteredDates = useMemo(
    () => dates.filter((d) => matchesFilters(d, filters, search)),
    [dates, filters, search],
  );

  const openDetail = useCallback((date: DateIdea) => {
    setSelectedDate(date);
    setSubScreen("detail");
  }, []);

  const openEdit = useCallback((date: DateIdea) => {
    setEditName(date.name);
    setEditDesc(date.description || "");
    setEditFilters({
      time_required: date.time_required || null,
      energy_level: date.energy_level || null,
      focus_required: date.focus_required || null,
      preparation_required: date.preparation_required || null,
      vibe: date.vibe || [],
      activity_type: date.activity_type || [],
      who_added: date.who_added || null,
    });
    setSelectedDate(date);
    setSubScreen("edit");
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedDate) return;
    await deleteDate(selectedDate.id);
    setConfirmDelete(false);
    setToast("Date deleted");
    onDatesChanged();
    setTimeout(() => {
      setToast(null);
      setSubScreen("list");
      setSelectedDate(null);
    }, 800);
  }, [selectedDate, onDatesChanged]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedDate || !editName.trim()) return;
    await updateDate(selectedDate.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      time_required: editFilters.time_required,
      energy_level: editFilters.energy_level,
      focus_required: editFilters.focus_required,
      preparation_required: editFilters.preparation_required,
      vibe: editFilters.vibe.length > 0 ? editFilters.vibe : null,
      activity_type: editFilters.activity_type.length > 0 ? editFilters.activity_type : null,
      who_added: editFilters.who_added,
    });
    setToast("Updated! ✨");
    onDatesChanged();
    setTimeout(() => {
      setToast(null);
      setSubScreen("list");
      setSelectedDate(null);
    }, 800);
  }, [selectedDate, editName, editDesc, editFilters, onDatesChanged]);

  const handleSubBack = useCallback(() => {
    if (subScreen === "edit") {
      setSubScreen("detail");
    } else if (subScreen === "detail") {
      setSubScreen("list");
      setSelectedDate(null);
    } else {
      onBack();
    }
  }, [subScreen, onBack]);

  const renderFilterTag = (label: string, value: string | string[] | null | undefined) => {
    if (!value) return null;
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0) return null;
    return values.map((v) => (
      <span key={`${label}-${v}`} className="dr-detail-tag">
        <span className="dr-detail-tag-label">{label}:</span> {v}
      </span>
    ));
  };

  const headerTitle = subScreen === "edit"
    ? "Edit Date"
    : subScreen === "detail"
      ? "Date Details"
      : "View Dates";

  return (
    <>
      <DSHeader title={headerTitle} />
      <div className="dr-content">
        {/* ── List view ── */}
        {subScreen === "list" && (
          <div className="dr-scroll-area dr-screen-enter">
            {/* Search */}
            <div className="dr-search-box">
              <span className="dr-search-icon"><Search size={18} aria-hidden="true" /></span>
              <input
                className="dr-input"
                type="text"
                placeholder="Search dates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter toggle */}
            <div className="dr-filter-bar">
              <button
                type="button"
                className={`dr-filter-toggle-btn ${filtersOpen ? "open" : ""}`}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <span className={`dr-filter-toggle-arrow ${filtersOpen ? "open" : ""}`}>▼</span>
                {filtersOpen ? "Hide Filters" : "Filter"}
              </button>
              {filtersOpen && (
                <FilterPanel filters={filters} onChange={setFilters} showAny />
              )}
            </div>

            {/* Date list */}
            {filteredDates.length > 0 ? (
              <div className="dr-date-list">
                {filteredDates.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="dr-date-item"
                    onClick={() => openDetail(d)}
                  >
                    <span className="dr-date-item-name">{d.name}</span>
                    <span className="dr-date-item-arrow">▶</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dr-empty">
                <div className="dr-empty-icon">{dates.length === 0 ? <Inbox size={30} aria-hidden="true" /> : <Frown size={30} aria-hidden="true" />}</div>
                <div>{dates.length === 0 ? "No dates yet!" : "No matches"}</div>
                <div style={{ fontSize: 12 }}>
                  {dates.length === 0 ? "Add some date ideas first" : "Try adjusting your search or filters"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Detail view ── */}
        {subScreen === "detail" && selectedDate && (
          <div className="dr-scroll-area dr-screen-enter">
            <div className="dr-detail-card">
              <div className="dr-detail-name">{selectedDate.name}</div>
              {selectedDate.description && (
                <div className="dr-detail-desc">{selectedDate.description}</div>
              )}
              <div className="dr-detail-tags">
                {renderFilterTag("Time", selectedDate.time_required)}
                {renderFilterTag("Energy", selectedDate.energy_level)}
                {renderFilterTag("Focus", selectedDate.focus_required)}
                {renderFilterTag("Prep", selectedDate.preparation_required)}
                {renderFilterTag("Vibe", selectedDate.vibe)}
                {renderFilterTag("Type", selectedDate.activity_type)}
                {renderFilterTag("Added by", selectedDate.who_added)}
              </div>
              <div className="dr-detail-actions">
                <button
                  type="button"
                  className="dr-ds-btn small"
                  onClick={() => openEdit(selectedDate)}
                >
                  <Pencil size={16} aria-hidden="true" /> Edit
                </button>
                <button
                  type="button"
                  className="dr-ds-btn small danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={16} aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit view ── */}
        {subScreen === "edit" && selectedDate && (
          <div className="dr-scroll-area dr-screen-enter">
            <div className="dr-form-group">
              <label className="dr-form-label" htmlFor="dr-edit-name">Name *</label>
              <input
                id="dr-edit-name"
                className="dr-input"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="dr-form-group">
              <label className="dr-form-label" htmlFor="dr-edit-desc">Description</label>
              <textarea
                id="dr-edit-desc"
                className="dr-input dr-textarea"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <FilterPanel filters={editFilters} onChange={setEditFilters} />
          </div>
        )}

        {/* Toast */}
        {toast && <div className="dr-toast">{toast}</div>}

      </div>
      {/* Keep the confirmation centered over the full screen, including the chrome. */}
      {confirmDelete && (
        <div className="dr-confirm-overlay">
          <div className="dr-confirm-card">
            <div className="dr-confirm-title">Delete this date?</div>
            <div className="dr-confirm-actions">
              <button
                type="button"
                className="dr-ds-btn small"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dr-ds-btn small danger"
                onClick={handleDelete}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <DSBottomBar
        onBack={handleSubBack}
        onOk={subScreen === "edit" && editName.trim() ? handleSaveEdit : undefined}
        okLabel="Save"
      />
    </>
  );
}
