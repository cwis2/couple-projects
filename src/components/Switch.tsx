import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { apps, getAppThumbnail, type SwitchApp } from "../apps";
import { getUserThumbnail, users, type SwitchUser } from "../users";

const musicFiles = import.meta.glob("../../music/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const menuTheme = musicFiles["../../music/menu.mp3"];
const appTheme = musicFiles["../../music/app.mp3"];

type Phase = "home" | "select" | "open" | "closing";
const EXIT_KEYS = new Set(["Backspace", "Delete", "Home", "Escape"]);
const ZOOM_MS = 450;

/* ---------------- Joy-Cons (purely decorative, with press states) ---------------- */
function LeftJoycon() {
  return (
    <div className="joycon joycon-left">
      <button className="shoulder" aria-label="L" />
      <div className="small-row"><button className="jc-btn btn-minus" aria-label="Minus">−</button></div>
      <div className="stick" aria-label="Left stick" />
      <div className="diamond">
        <button className="jc-btn up" aria-label="Up">▲</button>
        <button className="jc-btn left" aria-label="Left">◀</button>
        <button className="jc-btn right" aria-label="Right">▶</button>
        <button className="jc-btn down" aria-label="Down">▼</button>
      </div>
      <div className="small-row"><button className="jc-btn btn-capture" aria-label="Capture" /></div>
    </div>
  );
}

function RightJoycon({ onHome }: { onHome: () => void }) {
  return (
    <div className="joycon joycon-right">
      <button className="shoulder" aria-label="R" />
      <div className="small-row"><button className="jc-btn btn-plus" aria-label="Plus">+</button></div>
      <div className="diamond">
        <button className="jc-btn up">X</button>
        <button className="jc-btn left">Y</button>
        <button className="jc-btn right">A</button>
        <button className="jc-btn down">B</button>
      </div>
      <div className="stick" aria-label="Right stick" />
      <div className="small-row" style={{ justifyContent: "flex-end" }}>
        <button className="jc-btn btn-home" aria-label="Home" onClick={onHome}>⌂</button>
      </div>
    </div>
  );
}

/* ---------------- Top bar clock (client-only to avoid hydration mismatch) ---------------- */
function TopClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }));
    f();
    const i = setInterval(f, 10000);
    return () => clearInterval(i);
  }, []);
  return <span className="home-clock">{t}</span>;
}

export function NintendoSwitch() {
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<Phase>("home");
  const [pendingApp, setPendingApp] = useState<SwitchApp | null>(null);
  const [userIdx, setUserIdx] = useState(0);
  const [user, setUser] = useState<SwitchUser | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [fromRect, setFromRect] = useState<CSSProperties>({});

  const displayRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuMusicRef = useRef<HTMLAudioElement | null>(null);
  const appMusicRef = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const switchMusic = useCallback((playAppTheme: boolean) => {
    const active = playAppTheme ? appMusicRef.current : menuMusicRef.current;
    const inactive = playAppTheme ? menuMusicRef.current : appMusicRef.current;
    if (inactive && !inactive.paused) {
      inactive.pause();
      inactive.currentTime = 0;
    }
    if (active?.paused) void active.play().catch(() => {});
  }, []);

  useEffect(() => {
    const menuAudio = menuTheme ? new Audio(menuTheme) : null;
    const appAudio = appTheme ? new Audio(appTheme) : null;
    for (const audio of [menuAudio, appAudio]) {
      if (audio) {
        audio.loop = true;
        audio.volume = 0.2;
      }
    }
    menuMusicRef.current = menuAudio;
    appMusicRef.current = appAudio;
    switchMusic(false);

    return () => {
      menuAudio?.pause();
      appAudio?.pause();
      menuMusicRef.current = null;
      appMusicRef.current = null;
    };
  }, [switchMusic]);

  /** Measure tile position relative to the display, used as zoom origin. */
  const measureTile = useCallback((appId: string) => {
    const tile = tilesRef.current?.querySelector<HTMLElement>(`[data-app-id="${appId}"]`);
    const disp = displayRef.current;
    if (!tile || !disp) return {};
    const a = tile.getBoundingClientRect();
    const b = disp.getBoundingClientRect();
    return {
      "--from-top": `${a.top - b.top}px`,
      "--from-left": `${a.left - b.left}px`,
      "--from-width": `${a.width}px`,
      "--from-height": `${a.height}px`,
    } as CSSProperties;
  }, []);

  /** Step 1: show "Who's playing?" for the given app. */
  const openApp = useCallback((appId: string) => {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    setPendingApp(app);
    setUserIdx(0);
    setPhase("select");
  }, []);

  /** Step 2: called from a click/key gesture — go fullscreen & zoom in. */
  const launchWithUser = useCallback(
    (u: SwitchUser) => {
      if (!pendingApp) return;
      switchMusic(true);
      setUser(u);
      setFromRect(measureTile(pendingApp.id));
      setExpanded(false);
      setPhase("open");
      const el = containerRef.current;
      // Must run synchronously inside the user gesture.
      const req = el?.requestFullscreen?.bind(el);
      if (req) {
        req().then(() => setFallback(false)).catch(() => setFallback(true));
      } else setFallback(true);
      // Next frame(s): trigger the zoom transition.
      requestAnimationFrame(() => requestAnimationFrame(() => setExpanded(true)));
    },
    [pendingApp, measureTile, switchMusic],
  );

  /** Zoom back to the tile, leave fullscreen, return home. */
  const closeApp = useCallback(() => {
    if (phaseRef.current !== "open") return;
    switchMusic(false);
    setPhase("closing");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setExpanded(false);
    setTimeout(() => {
      setPhase("home");
      setPendingApp(null);
      setFallback(false);
    }, ZOOM_MS);
  }, [switchMusic]);

  // If the user exits fullscreen with Esc, close the app too.
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) closeApp(); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [closeApp]);

  // Keyboard handling for every phase (capture phase on window).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "open") {
        if (pendingApp?.id === "scheduler" && (e.key === "Backspace" || e.key === "Escape")) {
          return;
        }
        if (EXIT_KEYS.has(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          closeApp();
        }
        return;
      }
      if (phase === "closing") return;
      const prev = e.key === "ArrowLeft" || e.key === "ArrowUp";
      const next = e.key === "ArrowRight" || e.key === "ArrowDown";
      if (phase === "home") {
        // DOM-order navigation: works for any CSS layout.
        const tiles = tilesRef.current?.querySelectorAll<HTMLElement>(".home-tile") ?? [];
        if (prev || next) {
          e.preventDefault();
          setSelected((s) => {
            const n = Math.max(0, Math.min(tiles.length - 1, s + (next ? 1 : -1)));
            tiles[n]?.scrollIntoView({ block: "nearest", inline: "nearest" });
            return n;
          });
        } else if (e.key === "Enter") {
          e.preventDefault();
          const id = tiles[selected]?.dataset["appId"];
          if (id) openApp(id);
        }
      } else if (phase === "select") {
        if (prev || next) {
          e.preventDefault();
          setUserIdx((i) => (i + (next ? 1 : -1) + users.length) % users.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          { const u = users[userIdx]; if (u) launchWithUser(u); }
        } else if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          setPhase("home");
        }
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [phase, selected, userIdx, pendingApp, openApp, launchWithUser, closeApp]);

  const AppComp = pendingApp?.component;
  const showApp = (phase === "open" || phase === "closing") && AppComp && user;
  const isAppPhase = phase === "open" || phase === "closing";

  const resumeMusic = useCallback(() => {
    switchMusic(isAppPhase);
  }, [isAppPhase, switchMusic]);

  return (
    <div className="switch-page" onPointerDownCapture={resumeMusic} onKeyDownCapture={resumeMusic}>
      <div className="switch">
        <LeftJoycon />
        <div className="console-body">
          <div className="bezel">
            <span className="camera" />
            <span className="light-sensor" />
            <div className="display" ref={displayRef}>
              <div className={`home-screen${phase !== "home" ? " dimmed" : ""}`}>
                <header className="home-topbar">
                  <div className="user-icon">
                    <img
                      src={getUserThumbnail(user?.thumbnail ?? users[0]?.thumbnail)}
                      alt={user?.name ?? users[0]?.name ?? "Selected user"}
                    />
                  </div>
                  <div className="status">
                    <TopClock />
                    <span className="battery" aria-label="Battery 80%" />
                  </div>
                </header>
                <ul className="home-tiles" ref={tilesRef}>
                  {apps.map((app, i) => (
                    <li key={app.id}>
                      <button
                        className={`home-tile${i === selected ? " selected" : ""}${app.thumbnail ? " has-thumbnail" : ""}`}
                        data-app-id={app.id}
                        style={{ "--tile-color": app.color } as CSSProperties}
                        onMouseEnter={() => phase === "home" && setSelected(i)}
                        onClick={() => { setSelected(i); openApp(app.id); }}
                        tabIndex={-1}
                      >
                        {app.thumbnail && (
                          <img className="tile-thumbnail" src={getAppThumbnail(app.thumbnail)} alt="" />
                        )}
                        <span className="tile-name">{app.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <nav className="home-dock">
                  {[["📰", "News"], ["🛍️", "Shop"], ["⚙️", "Settings"], ["⏻", "Power"]].map(([ic, n]) => (
                    <button key={n} className="home-dock-icon" aria-label={n} title={n} tabIndex={-1}>{ic}</button>
                  ))}
                </nav>
              </div>

              {phase === "select" && (
                <div className="user-select">
                  <h2>Who's playing?</h2>
                  <div className="user-list">
                    {users.map((u, i) => (
                      <button
                        key={u.id}
                        className={`user-card${i === userIdx ? " selected" : ""}`}
                        onMouseEnter={() => setUserIdx(i)}
                        onClick={() => launchWithUser(u)}
                        tabIndex={-1}
                      >
                        <img className="user-avatar" src={getUserThumbnail(u.thumbnail)} alt="" />
                        {u.name}
                      </button>
                    ))}
                  </div>
                  <span className="hint">← → to choose · Enter to start · Backspace to cancel</span>
                </div>
              )}

              {/* Always mounted so requestFullscreen can target it inside the gesture. */}
              <div
                ref={containerRef}
                className={`app-container${showApp ? " active" : ""}${expanded ? " expanded" : ""}${fallback ? " fixed-fallback" : ""}`}
                style={fromRect}
              >
                <div className="app-inner">{showApp && <AppComp user={user} />}</div>
              </div>
            </div>
          </div>
        </div>
        <RightJoycon onHome={closeApp} />
      </div>
    </div>
  );
}
