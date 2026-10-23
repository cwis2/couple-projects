import { useEffect, useState, useCallback, useRef } from "react";
import type { AppProps } from "../../apps";
import type { DateIdea } from "../../lib/date-randomizer/types";
import { getAllDates } from "../../lib/date-randomizer/db";
import { HomeScreen, type HomeDestination } from "./HomeScreen";
import { AddDateScreen } from "./AddDateScreen";
import { RandomDateScreen } from "./RandomDateScreen";
import { ViewDatesScreen } from "./ViewDatesScreen";
import "./ds-date-theme.css";

type Screen = "home" | "add" | "random" | "view";

// Soft click sound (very short, synthesized)
function playClick() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // Audio not available, that's fine
  }
}

export function DateRandomizerApp({ user, onExit }: AppProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [dates, setDates] = useState<DateIdea[]>([]);
  const [homeFocus, setHomeFocus] = useState(-1);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Keep a ref to the current screen for keyboard handler stability
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // Load dates
  const loadDates = useCallback(async () => {
    const loaded = await getAllDates();
    setDates(loaded);
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  // Refresh when returning to list
  useEffect(() => {
    if (screen === "home" || screen === "view") {
      loadDates();
    }
  }, [screen, loadDates]);

  // Navigation
  const navigateTo = useCallback((dest: Screen) => {
    playClick();
    setScreen(dest);
  }, []);

  const handleHomeNav = useCallback((dest: HomeDestination) => {
    playClick();
    setScreen(dest);
  }, []);

  const handleBack = useCallback(() => {
    playClick();
    setScreen("home");
  }, []);

  const handleDateSaved = useCallback(() => {
    loadDates();
    setTimeout(() => setScreen("home"), 100);
  }, [loadDates]);

  // ─── Keyboard shortcuts (B = back, A = OK) ─────────────────
  // The A/B buttons in the bottom bar fire click events via this handler.
  // We also intercept the B and A keys on the keyboard itself.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const key = e.key.toLowerCase();

      if (key === "b") {
        e.preventDefault();
        // Simulate clicking the B/Back button
        const backBtn = viewportRef.current?.querySelector<HTMLButtonElement>(".dr-bottom-bar .dr-bar-btn:first-child");
        if (backBtn) {
          backBtn.click();
        }
      }

      if (key === "a") {
        e.preventDefault();
        // Simulate clicking the A/OK button
        const okBtn = viewportRef.current?.querySelector<HTMLButtonElement>(".dr-bottom-bar .dr-bar-btn:last-child");
        if (okBtn) {
          okBtn.click();
        }
      }

      // Arrow key navigation on home screen
      if (screenRef.current === "home") {
        if (key === "arrowup") {
          e.preventDefault();
          setHomeFocus(0);
        } else if (key === "arrowdown") {
          e.preventDefault();
          setHomeFocus((prev) => (prev < 0 ? 1 : prev === 0 ? 1 : prev));
        } else if (key === "arrowleft") {
          e.preventDefault();
          setHomeFocus((prev) => (prev < 0 ? 1 : prev === 2 ? 1 : prev));
        } else if (key === "arrowright") {
          e.preventDefault();
          setHomeFocus((prev) => (prev < 0 ? 2 : prev === 1 ? 2 : prev));
        } else if (key === "enter") {
          e.preventDefault();
          const dests: HomeDestination[] = ["view", "add", "random"];
          if (homeFocus >= 0) handleHomeNav(dests[homeFocus]);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [homeFocus, handleHomeNav]);

  return (
    <div className="dr-viewport" ref={viewportRef}>
      <div className={`dr-screen ${screen === "home" ? "dr-main-menu-screen" : ""}`}>
        {screen === "home" && (
          <HomeScreen onNavigate={handleHomeNav} focusedIndex={homeFocus} onExit={onExit} />
        )}
        {screen === "add" && (
          <AddDateScreen
            onBack={handleBack}
            onSaved={handleDateSaved}
            currentUserId={user?.id || "cwis"}
          />
        )}
        {screen === "random" && (
          <RandomDateScreen dates={dates} onBack={handleBack} />
        )}
        {screen === "view" && (
          <ViewDatesScreen dates={dates} onBack={handleBack} onDatesChanged={loadDates} />
        )}
      </div>
    </div>
  );
}

export default DateRandomizerApp;
