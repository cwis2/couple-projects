import { createFileRoute } from "@tanstack/react-router";
import { NintendoSwitch } from "../components/Switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neon Switch — Handheld Console in Your Browser" },
      { name: "description", content: "A full-width neon Nintendo Switch replica with a working home screen and apps." },
      { property: "og:title", content: "Neon Switch — Handheld Console in Your Browser" },
      { property: "og:description", content: "A full-width neon Nintendo Switch replica with a working home screen and apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NintendoSwitch,
});
