import type { ComponentType } from "react";
import type { SwitchUser } from "./users";
import { ClockApp, SnakeApp, HelloApp } from "./components/apps";

export interface AppProps {
  user: SwitchUser;
}

/** Home screen tiles. Add an entry here to add an app. `color` is a CSS value (use theme vars). */
export interface SwitchApp {
  id: string;
  name: string;
  icon: string;
  color: string;
  component: ComponentType<AppProps>;
}

export const apps: SwitchApp[] = [
  { id: "clock", name: "Clock", icon: "🕒", color: "var(--app-clock)", component: ClockApp },
  { id: "snake", name: "Snake", icon: "🐍", color: "var(--app-snake)", component: SnakeApp },
  { id: "hello", name: "Hello", icon: "👋", color: "var(--app-hello)", component: HelloApp },
];
