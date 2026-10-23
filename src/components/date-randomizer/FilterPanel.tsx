import { type FilterState, type FilterCategory, FILTER_CATEGORIES } from "../../lib/date-randomizer/types";

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  showAny?: boolean;
  excludeCategories?: (keyof FilterState)[];
}

export function FilterPanel({ filters, onChange, showAny = false, excludeCategories = [] }: FilterPanelProps) {
  const handleSingleSelect = (cat: FilterCategory, value: string) => {
    const key = cat.key as keyof FilterState;
    const current = filters[key];
    if (current === value) {
      onChange({ ...filters, [key]: null });
    } else {
      onChange({ ...filters, [key]: value });
    }
  };

  const handleMultiSelect = (cat: FilterCategory, value: string) => {
    const key = cat.key as keyof FilterState;
    const current = filters[key] as string[];
    if (current.includes(value)) {
      onChange({ ...filters, [key]: current.filter((v) => v !== value) });
    } else {
      onChange({ ...filters, [key]: [...current, value] });
    }
  };

  const handleClearCategory = (cat: FilterCategory) => {
    const key = cat.key as keyof FilterState;
    if (cat.multiSelect) {
      onChange({ ...filters, [key]: [] });
    } else {
      onChange({ ...filters, [key]: null });
    }
  };

  return (
    <div className="dr-filter-panel">
      {FILTER_CATEGORIES.filter((cat) => !excludeCategories.includes(cat.key as keyof FilterState)).map((cat) => {
        const key = cat.key as keyof FilterState;
        const value = filters[key];
        const isAny = cat.multiSelect
          ? (value as string[]).length === 0
          : value === null;

        return (
          <div key={cat.key} className="dr-filter-cat">
            <span className="dr-filter-cat-label">{cat.label}</span>
            <div className="dr-chip-row">
              {showAny && (
                <button
                  type="button"
                  className={`dr-chip any-chip ${isAny ? "active" : ""}`}
                  onClick={() => handleClearCategory(cat)}
                >
                  Any
                </button>
              )}
              {cat.options.map((opt) => {
                const isActive = cat.multiSelect
                  ? (value as string[]).includes(opt)
                  : value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`dr-chip ${isActive ? "active" : ""}`}
                    onClick={() =>
                      cat.multiSelect
                        ? handleMultiSelect(cat, opt)
                        : handleSingleSelect(cat, opt)
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
