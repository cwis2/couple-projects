/** Profiles shown on the "Who's playing?" screen. `color` should be a CSS value (ideally a theme variable). */
export interface SwitchUser {
  id: string;
  name: string;
  thumbnail: string;
}

export const users: SwitchUser[] = [
  { id: "cwis", name: "Cwis", thumbnail: "cwis.jpg" },
  { id: "monokork", name: "Monokork", thumbnail: "monokork.jpg" },
];

const userImages = import.meta.glob("../images/*", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export function getUserThumbnail(filename?: string) {
  return filename ? userImages[`../images/${filename}`] : undefined;
}
