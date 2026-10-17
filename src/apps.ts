import type { ComponentType } from "react";
import type { SwitchUser } from "./users";
import { PlaceholderApp } from "./components/apps";
import { OverlapFinderApp } from "./components/overlap-finder/OverlapFinderApp";

export interface AppProps {
  user: SwitchUser;
}

/** Home screen tiles. Add an entry here to add an app. `color` is a CSS value (use theme vars). */
export interface SwitchApp {
  id: string;
  name: string;
  color: string;
  /** Optional image filename from the repository's images/ directory. */
  thumbnail?: string;
  component: ComponentType<AppProps>;
}

const appImages = import.meta.glob("../images/*", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export function getAppThumbnail(filename?: string) {
  return filename ? appImages[`../images/${filename}`] : undefined;
}

export const apps: SwitchApp[] = [
  { id: "calendar", name: "", color: "#0D1321", thumbnail: "advent_calendar.png", component: PlaceholderApp },
  { id: "date", name: "", color: "#1D2D44", thumbnail: "date_randomizer.png", component: PlaceholderApp },
  { id: "plans", name: "", color: "#3E5C76", thumbnail: "in_person_list.png", component: PlaceholderApp },
  { id: "scheduler", name: "Overlap Finder", color: "#748CAB", thumbnail: "overlap_finder.png", component: OverlapFinderApp },
  { id: "playlist", name: "", color: "#B2BCC2", thumbnail: "playlist_adder.png", component: PlaceholderApp },
  { id: "trip", name: "", color: "#F0EBD8", thumbnail: "trip_planner.png", component: PlaceholderApp },
];

