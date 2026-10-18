"use client";

import { useEffect, useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;

// Checks for a newer deploy when the page opens and whenever it comes back
// to the foreground; the iPhone Home Screen app otherwise keeps the old page.
export function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const check = () =>
      fetch(`${BASE_PATH}/version.json?t=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ id: string }>) : null))
        .then((v) => v && BUILD_ID && v.id !== BUILD_ID && setStale(true))
        .catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && void check();
    void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!stale) return null;
  return (
    <button
      onClick={() => window.location.reload()}
      className="block w-full bg-accent px-4 py-2 text-center text-sm font-medium text-zinc-950"
    >
      A new version of BRV Health is available. Tap to reload.
    </button>
  );
}
