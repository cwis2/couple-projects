import { DSHeader, DSBottomBar, YellowBrackets } from "./DSChrome";
import { Dices, List, Plus } from "lucide-react";

export type HomeDestination = "view" | "add" | "random";

interface HomeScreenProps {
  onNavigate: (dest: HomeDestination) => void;
  focusedIndex: number;
  onExit?: () => void;
}

export function HomeScreen({ onNavigate, focusedIndex, onExit }: HomeScreenProps) {
  return (
    <>
      <DSHeader title="Date Randomizer" />
      <div className="dr-content">
        <div className="dr-home-content">
          {/* Open on the menu itself; selecting an item is a separate action. */}
          <button
            type="button"
            className={`dr-ds-btn dr-home-primary ${focusedIndex === 0 ? "dr-bracket-highlight" : ""}`}
            onClick={() => onNavigate("view")}
          >
            <YellowBrackets />
            <List className="dr-home-icon" aria-hidden="true" />
            <span>View / Delete Dates</span>
          </button>

          {/* Bottom row: two buttons */}
          <div className="dr-home-row">
            <button
              type="button"
              className={`dr-ds-btn ${focusedIndex === 1 ? "dr-bracket-highlight" : ""}`}
              onClick={() => onNavigate("add")}
            >
              <YellowBrackets />
              <Plus className="dr-home-icon" aria-hidden="true" />
              <span>Add Date</span>
            </button>
            <button
              type="button"
              className={`dr-ds-btn ${focusedIndex === 2 ? "dr-bracket-highlight" : ""}`}
              onClick={() => onNavigate("random")}
            >
              <YellowBrackets />
              <Dices className="dr-home-icon" aria-hidden="true" />
              <span>Random Date</span>
            </button>
          </div>
        </div>
      </div>
      <DSBottomBar
        onBack={() => onExit?.()}
        onOk={() => {
          if (focusedIndex === 0) onNavigate("view");
          if (focusedIndex === 1) onNavigate("add");
          if (focusedIndex === 2) onNavigate("random");
        }}
      />
    </>
  );
}
