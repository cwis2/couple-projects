import { useState, useCallback, useMemo } from "react";
import { Dices, Frown } from "lucide-react";
import { DSHeader, DSBottomBar } from "./DSChrome";
import { FilterPanel } from "./FilterPanel";
import { emptyFilters, type FilterState, FILTER_CATEGORIES } from "../../lib/date-randomizer/types";
import type { DateIdea } from "../../lib/date-randomizer/types";

interface RandomDateScreenProps {
  dates: DateIdea[];
  onBack: () => void;
}

type Phase = "filters" | "result";

function matchesFilters(date: DateIdea, filters: FilterState): boolean {
  for (const cat of FILTER_CATEGORIES) {
    const key = cat.key as keyof FilterState;
    const filterVal = filters[key];

    // Skip if filter is "Any" (null or empty array)
    if (cat.multiSelect) {
      if ((filterVal as string[]).length === 0) continue;
    } else {
      if (filterVal === null) continue;
    }

    const dateVal = date[cat.key as keyof DateIdea];

    // If the date has no value for this category, exclude it
    // (only when actively filtering)
    if (dateVal === null || dateVal === undefined) return false;

    if (cat.multiSelect) {
      // Date's array must contain at least one of the filtered values
      const dateArr = Array.isArray(dateVal) ? dateVal : [];
      const filterArr = filterVal as string[];
      if (!filterArr.some((f) => dateArr.includes(f))) return false;
    } else {
      if (dateVal !== filterVal) return false;
    }
  }
  return true;
}

export function RandomDateScreen({ dates, onBack }: RandomDateScreenProps) {
  const [phase, setPhase] = useState<Phase>("filters");
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [result, setResult] = useState<DateIdea | null>(null);
  const [lastResultId, setLastResultId] = useState<string | null>(null);

  const matching = useMemo(
    () => dates.filter((d) => matchesFilters(d, filters)),
    [dates, filters],
  );

  const pickRandom = useCallback(() => {
    if (matching.length === 0) {
      setResult(null);
      setPhase("result");
      return;
    }

    // Avoid repeating the same one if possible
    let candidates = matching;
    if (lastResultId && matching.length > 1) {
      candidates = matching.filter((d) => d.id !== lastResultId);
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setResult(pick);
    setLastResultId(pick.id);
    setPhase("result");
  }, [matching, lastResultId]);

  const handleOk = useCallback(() => {
    if (phase === "filters") {
      pickRandom();
    }
  }, [phase, pickRandom]);

  const handleBackFromResult = useCallback(() => {
    setPhase("filters");
  }, []);

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

  return (
    <>
      <DSHeader title={phase === "filters" ? "Random Date" : "Your Date!"} />
      <div className="dr-content">
        {phase === "filters" && (
          <div className="dr-scroll-area dr-screen-enter">
            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: "#4a4a6a", textAlign: "center" }}>
              Set filters or leave as "Any" to include everything
            </div>
            <FilterPanel filters={filters} onChange={setFilters} showAny />
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: "#6a6a8a" }}>
              {matching.length} date{matching.length !== 1 ? "s" : ""} match
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="dr-scroll-area dr-screen-enter dr-result-area">
            {result ? (
              <div className="dr-result-card">
                <div className="dr-result-name">{result.name}</div>
                {result.description && (
                  <div className="dr-result-desc">{result.description}</div>
                )}
                <div className="dr-result-tags">
                  {renderFilterTag("Time", result.time_required)}
                  {renderFilterTag("Energy", result.energy_level)}
                  {renderFilterTag("Focus", result.focus_required)}
                  {renderFilterTag("Prep", result.preparation_required)}
                  {renderFilterTag("Vibe", result.vibe)}
                  {renderFilterTag("Type", result.activity_type)}
                  {renderFilterTag("Added by", result.who_added)}
                </div>
                <button
                  type="button"
                  className="dr-ds-btn small"
                  onClick={pickRandom}
                  style={{ marginTop: 4 }}
                >
                  <Dices size={17} aria-hidden="true" /> Reroll
                </button>
              </div>
            ) : (
              <div className="dr-empty">
                <div className="dr-empty-icon"><Frown size={30} aria-hidden="true" /></div>
                <div>No dates match those filters</div>
                <div style={{ fontSize: 12 }}>Try loosening up some filters!</div>
              </div>
            )}
          </div>
        )}
      </div>
      <DSBottomBar
        onBack={phase === "result" ? handleBackFromResult : onBack}
        onOk={phase === "filters" ? handleOk : undefined}
        okLabel="Pick!"
      />
    </>
  );
}
