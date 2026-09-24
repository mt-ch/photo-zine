// PROTOTYPE — floating bottom bar for cycling design variants. Not for production.
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export const VARIANTS = [
  { key: "A", name: "Full-bleed hero" },
  { key: "B", name: "Split canvas" },
  { key: "C", name: "Editorial index" },
] as const;

export function PrototypeSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("variant") ?? "A";
  const active = Math.max(
    0,
    VARIANTS.findIndex((v) => v.key === current),
  );

  function go(next: number) {
    const key = VARIANTS[(next + VARIANTS.length) % VARIANTS.length].key;
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", key);
    router.replace(`?${params.toString()}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(active - 1);
      if (e.key === "ArrowRight") go(active + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 font-mono text-xs text-black shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
      <button
        onClick={() => go(active - 1)}
        aria-label="Previous variant"
        className="px-1"
      >
        &larr;
      </button>
      <span className="whitespace-nowrap">
        {VARIANTS[active].key} &mdash; {VARIANTS[active].name}
      </span>
      <button
        onClick={() => go(active + 1)}
        aria-label="Next variant"
        className="px-1"
      >
        &rarr;
      </button>
    </div>
  );
}
