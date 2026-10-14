import { useEffect, useRef, useState } from "react";
import type { AppProps } from "../apps";

const EXIT_HINT = "Backspace · Delete · Home · Enter · Tab to exit";

export function ClockApp({ user }: AppProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="app-center">
      <div className="app-big">{now ? now.toLocaleTimeString() : "--:--:--"}</div>
      <div className="app-sub">Hi {user.name} — {now?.toDateString()}</div>
      <div className="app-hint">{EXIT_HINT}</div>
    </div>
  );
}

export function HelloApp({ user }: AppProps) {
  return (
    <div className="app-center">
      <div className="app-big">{user.avatar} Hello, {user.name}</div>
      <div className="app-hint">{EXIT_HINT}</div>
    </div>
  );
}

const N = 16;
type P = [number, number];

export function SnakeApp({ user }: AppProps) {
  const [snake, setSnake] = useState<P[]>([[8, 8], [7, 8], [6, 8]]);
  const [food, setFood] = useState<P>([12, 8]);
  const [over, setOver] = useState(false);
  const dir = useRef<P>([1, 0]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, P> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      const d = m[e.key];
      if (!d) return;
      e.preventDefault();
      if (d[0] !== -dir.current[0] || d[1] !== -dir.current[1]) dir.current = d;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (over) return;
    const t = setInterval(() => {
      setSnake((s) => {
        const head: P = [(s[0]![0] + dir.current[0] + N) % N, (s[0]![1] + dir.current[1] + N) % N];
        if (s.some(([x, y]) => x === head[0] && y === head[1])) { setOver(true); return s; }
        const ate = head[0] === food[0] && head[1] === food[1];
        if (ate) setFood([Math.floor(Math.random() * N), Math.floor(Math.random() * N)]);
        return [head, ...(ate ? s : s.slice(0, -1))];
      });
    }, 130);
    return () => clearInterval(t);
  }, [food, over]);

  const cells = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const body = snake.some(([a, b]) => a === x && b === y);
      const f = food[0] === x && food[1] === y;
      cells.push(<div key={`${x}-${y}`} className={`snake-cell${body ? " body" : ""}${f ? " food" : ""}`} />);
    }

  return (
    <div className="app-center">
      <div className="app-sub">{user.name} · Score {snake.length - 3}{over ? " · Game over" : ""}</div>
      <div className="snake-board" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>{cells}</div>
      <div className="app-hint">Arrows to steer · {EXIT_HINT}</div>
    </div>
  );
}
