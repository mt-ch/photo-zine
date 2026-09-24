"use client";

// PROTOTYPE — Variant D: Infinite grid, take 2. Photos keep their own
// aspect ratio inside an evenly-spaced slot on a white canvas; drag has
// release inertia for an "awards site" feel rather than 1:1 tracking.

import { useEffect, useState } from "react";
import { PlaceholderPhoto } from "./placeholder-photo";
import { photos, theme, issueNumber } from "./data";
import { mod, useDragPan } from "./use-drag-pan";

const SLOT = 340;
const MAX_PHOTO = 220;

function photoAt(row: number, col: number) {
  const index = mod(Math.abs(row * 31 + col * 17), photos.length);
  return photos[index];
}

function photoSize(aspect: number) {
  return aspect >= 1
    ? { width: MAX_PHOTO, height: MAX_PHOTO / aspect }
    : { width: MAX_PHOTO * aspect, height: MAX_PHOTO };
}

export function VariantD() {
  const { offset, dragging, bind } = useDragPan();
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());

  useEffect(() => {
    function onResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const colStart = Math.floor((-offset.x - SLOT) / SLOT);
  const colEnd = Math.ceil((-offset.x + viewport.width + SLOT) / SLOT);
  const rowStart = Math.floor((-offset.y - SLOT) / SLOT);
  const rowEnd = Math.ceil((-offset.y + viewport.height + SLOT) / SLOT);

  const tiles: { row: number; col: number }[] = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      tiles.push({ row, col });
    }
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-white touch-none cursor-grab active:cursor-grabbing"
      {...bind}
    >
      <div
        className="absolute left-0 top-0 transition-transform ease-out"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${dragging ? 0.985 : 1})`,
          transitionDuration: dragging ? "0ms" : "400ms",
        }}
      >
        {tiles.map(({ row, col }) => {
          const photo = photoAt(row, col);
          const key = `${row},${col}`;
          const size = photoSize(photo.aspect);
          return (
            <div
              key={key}
              className="group absolute flex items-center justify-center"
              style={{
                left: col * SLOT,
                top: row * SLOT,
                width: SLOT,
                height: SLOT,
              }}
              onPointerEnter={() =>
                setDiscovered((prev) => new Set(prev).add(photo.id))
              }
            >
              <div
                className="relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ width: size.width, height: size.height }}
              >
                <PlaceholderPhoto photo={photo} className="h-full w-full" />
              </div>
              <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <p className="text-xs font-medium text-black">
                  {photo.credit.name}
                </p>
                {photo.caption && (
                  <p className="text-[11px] text-black/50">{photo.caption}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none fixed left-6 top-6 text-black">
        <p className="font-mono text-[11px] uppercase tracking-widest text-black/40">
          Issue {issueNumber}
        </p>
        <p className="text-lg font-medium">{theme}</p>
      </div>

      <div className="pointer-events-none fixed bottom-6 right-6 rounded-full border border-black/10 px-3 py-1 font-mono text-xs text-black/50">
        {discovered.size}/{photos.length} discovered
      </div>

      <p className="pointer-events-none fixed bottom-6 left-6 font-mono text-xs text-black/30">
        Drag to explore
      </p>
    </div>
  );
}
