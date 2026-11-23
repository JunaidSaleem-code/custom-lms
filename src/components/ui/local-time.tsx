"use client";

import { useSyncExternalStore } from "react";

type Props = {
  iso: string;
  kind?: "date" | "datetime" | "time";
};

const subscribe = () => () => {};

// Renders a timestamp in the viewer's own timezone. The server cannot know it, so the
// server renders the ISO value and the browser formats it after hydration (no mismatch).
export function LocalTime({ iso, kind = "datetime" }: Props) {
  const text = useSyncExternalStore(
    subscribe,
    () => format(iso, kind),
    () => null,
  );
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text ?? iso.slice(0, 10)}
    </time>
  );
}

function format(iso: string, kind: "date" | "datetime" | "time"): string {
  const d = new Date(iso);
  if (kind === "date") return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  if (kind === "time") return d.toLocaleTimeString(undefined, { timeStyle: "short" });
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
