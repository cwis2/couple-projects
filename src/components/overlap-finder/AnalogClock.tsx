import { useEffect, useState } from "react";

export function AnalogClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Tick live every second
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Analog angles
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  // Digital formatted time (24h or 12h)
  const digitalTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Numerals 1 to 12 coordinates around radius ~ 68 in a 180x180 viewBox
  const numerals = [
    { num: "12", x: 90, y: 30 },
    { num: "1", x: 124, y: 38 },
    { num: "2", x: 148, y: 64 },
    { num: "3", x: 156, y: 95 },
    { num: "4", x: 148, y: 126 },
    { num: "5", x: 124, y: 152 },
    { num: "6", x: 90, y: 160 },
    { num: "7", x: 56, y: 152 },
    { num: "8", x: 32, y: 126 },
    { num: "9", x: 24, y: 95 },
    { num: "10", x: 32, y: 64 },
    { num: "11", x: 56, y: 38 },
  ];

  return (
    <div className="ds-clock-card">
      <div className="ds-clock-squircle">
        <svg viewBox="0 0 180 180" width="100%" height="100%">
          {/* Tick marks around perimeter */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = i * 6;
            const isHourTick = i % 5 === 0;
            const r1 = isHourTick ? 74 : 77;
            const r2 = 80;
            const rad = (angle - 90) * (Math.PI / 180);
            const x1 = 90 + r1 * Math.cos(rad);
            const y1 = 90 + r1 * Math.sin(rad);
            const x2 = 90 + r2 * Math.cos(rad);
            const y2 = 90 + r2 * Math.sin(rad);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isHourTick ? "var(--ds-clock-numbers)" : "rgba(0,0,0,0.2)"}
                strokeWidth={isHourTick ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Bold Numerals */}
          {numerals.map(({ num, x, y }) => (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--ds-clock-numbers)"
              fontFamily="var(--ds-font-pixel)"
              fontSize="14"
              fontWeight="bold"
            >
              {num}
            </text>
          ))}

          {/* Hour hand */}
          <line
            x1="90"
            y1="90"
            x2="90"
            y2="46"
            stroke="var(--ds-clock-hand-hour)"
            strokeWidth="5"
            strokeLinecap="round"
            transform={`rotate(${hourAngle} 90 90)`}
          />

          {/* Minute hand */}
          <line
            x1="90"
            y1="90"
            x2="90"
            y2="32"
            stroke="var(--ds-clock-hand-min)"
            strokeWidth="3.5"
            strokeLinecap="round"
            transform={`rotate(${minuteAngle} 90 90)`}
          />

          {/* Second hand */}
          <g transform={`rotate(${secondAngle} 90 90)`}>
            <line
              x1="90"
              y1="104"
              x2="90"
              y2="24"
              stroke="var(--ds-clock-hand-sec)"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="90" cy="24" r="3" fill="var(--ds-clock-hand-sec)" />
          </g>

          {/* Center Pivot Pin */}
          <circle cx="90" cy="90" r="5" fill="var(--ds-clock-pin)" />
          <circle cx="90" cy="90" r="2" fill="#ffffff" />
        </svg>
      </div>

      <div className="ds-clock-digital">{digitalTime}</div>
    </div>
  );
}
