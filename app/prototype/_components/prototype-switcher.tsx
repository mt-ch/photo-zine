"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// PROTOTYPE — throwaway. Floating bottom bar for flipping between UI variants.
// See mattpocock-skills:prototype UI.md. Hidden outside development.

type Variant = { key: string; name: string };

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: Variant[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const index = variants.findIndex((v) => v.key === current);

  const go = useCallback(
    (delta: number) => {
      const nextIndex = (index + delta + variants.length) % variants.length;
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", variants[nextIndex].key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [index, variants, pathname, router, searchParams],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;

  const currentVariant = variants[index];

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center">
      <div className="flex items-center gap-3 rounded-full border border-black/10 bg-black px-4 py-2 text-white shadow-lg">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous variant"
          className="text-lg leading-none px-1 hover:opacity-70"
        >
          ←
        </button>
        <span className="text-sm font-mono whitespace-nowrap">
          {currentVariant.key} — {currentVariant.name}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next variant"
          className="text-lg leading-none px-1 hover:opacity-70"
        >
          →
        </button>
      </div>
    </div>
  );
}
