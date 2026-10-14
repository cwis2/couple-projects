/** Profiles shown on the "Who's playing?" screen. `color` should be a CSS value (ideally a theme variable). */
export interface SwitchUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export const users: SwitchUser[] = [
  { id: "mario", name: "Mario", avatar: "🍄", color: "var(--app-hello)" },
  { id: "link", name: "Link", avatar: "🗡️", color: "var(--app-snake)" },
  { id: "kirby", name: "Kirby", avatar: "⭐", color: "var(--joycon-left)" },
  { id: "guest", name: "Guest", avatar: "👤", color: "var(--tile-bg)" },
];
