import { useEffect, useState, type KeyboardEvent } from "react";
import type { WeekTarget } from "../../lib/overlap-finder/types";
import { getWeekRange } from "../../lib/overlap-finder/dates";

interface HomeMenuProps {
  onSelectWeek: (target: WeekTarget) => void;
  currentDate?: Date;
}

export function HomeMenu({ onSelectWeek, currentDate = new Date() }: HomeMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const thisWeek = getWeekRange("this_week", currentDate);
  const nextWeek = getWeekRange("next_week", currentDate);

  const tiles = [
    {
      id: "next_week" as WeekTarget,
      title: "Schedule Next Week",
      subtitle: `Plan ahead: ${nextWeek.formattedRange}`,
      accentBg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      iconType: "next",
    },
    {
      id: "this_week" as WeekTarget,
      title: "Change This Week",
      subtitle: `Current active: ${thisWeek.formattedRange}`,
      accentBg: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
      iconType: "this",
    },
  ];

  // Global arrow keys + Enter navigation on bottom screen
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelectWeek(tiles[selectedIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, onSelectWeek, tiles]);

  const handleTileKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectWeek(tiles[index].id);
    }
  };

  const formattedToday = currentDate.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="ds-screen ds-screen-bottom">
      {/* Status strip */}
      <div className="ds-status-strip">
        <span>TOUCH SCREEN HOME</span>
        <span>SELECT MODE</span>
        <span>🎮 D-PAD / TOUCH</span>
      </div>

      {/* Main Home Menu Tiles */}
      <div className="ds-home-content">
        {tiles.map((tile, idx) => {
          const isSelected = selectedIndex === idx;

          return (
            <div
              key={tile.id}
              role="button"
              tabIndex={0}
              className={`ds-game-tile ${isSelected ? "selected" : ""}`}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => onSelectWeek(tile.id)}
              onKeyDown={(e) => handleTileKeyDown(e, idx)}
              aria-label={tile.title}
            >
              {/* DS Cartridge Slot Icon */}
              <div
                className="ds-tile-icon-box"
                style={{ background: tile.accentBg }}
              >
                {tile.iconType === "next" ? (
                  // Custom Calendar + Forward Arrow SVG
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <polyline points="12 14 16 17 12 20" />
                  </svg>
                ) : (
                  // Custom Calendar + Edit Pen SVG
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M11 14h2l4-4-2-2-4 4v2z" />
                  </svg>
                )}
              </div>

              {/* Title & Date range */}
              <div className="ds-tile-info">
                <span className="ds-tile-title">{tile.title}</span>
                <span className="ds-tile-subtitle">{tile.subtitle}</span>
              </div>

              {/* Retro selection arrow indicator */}
              {isSelected && (
                <div style={{ fontFamily: "var(--ds-font-pixel)", fontSize: "16px", color: "var(--ds-tile-selected-border)" }}>
                  ▶
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer strip with current date and selected target preview */}
      <div className="ds-footer-strip">
        <span>Today: {formattedToday}</span>
        <span>Editing: {selectedIndex === 0 ? "Next Week" : "This Week"}</span>
      </div>
    </div>
  );
}
