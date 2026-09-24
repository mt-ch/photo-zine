"use client";

// PROTOTYPE — Variant E: Staggered columns. Same infinite draggable canvas
// as Variant D, but columns alternate a half-tile vertical offset, closer
// to the reference sites' masonry-like column layout.

import { useEffect, useState } from "react";
import { PlaceholderPhoto } from "./placeholder-photo";
import { photos, theme, issueNumber } from "./data";
import { mod, useDragPan } from "./use-drag-pan";

const CELL = 240;
const GAP = 6;

function photoAt(row: number, col: number) {
  const index = mod(Math.abs(row * 23 + col * 41), photos.length);
  return photos[index];
}

export function VariantE() {
  const { offset, bind } = useDragPan();
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

  const colStart = Math.floor((-offset.x - CELL) / CELL);
  const colEnd = Math.ceil((-offset.x + viewport.width + CELL) / CELL);
  const rowStart = Math.floor((-offset.y - CELL * 2) / CELL);
  const rowEnd = Math.ceil((-offset.y + viewport.height + CELL * 2) / CELL);

  const tiles: { row: number; col: number }[] = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      tiles.push({ row, col });
    }
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[#111] touch-none cursor-grab active:cursor-grabbing"
      {...bind}
    >
      <div
        className="absolute left-0 top-0"
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      >
        {tiles.map(({ row, col }) => {
          const photo = photoAt(row, col);
          const key = `${row},${col}`;
          const colOffset = mod(col, 2) === 0 ? 0 : CELL / 2;
          return (
            <div
              key={key}
              className="group absolute overflow-hidden rounded-sm"
              style={{
                left: col * CELL,
                top: row * CELL + colOffset,
                width: CELL - GAP,
                height: CELL - GAP,
              }}
              onPointerEnter={() =>
                setDiscovered((prev) => new Set(prev).add(photo.id))
              }
            >
              <PlaceholderPhoto photo={photo} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs font-medium text-white">
                  {photo.credit.name} · {photo.credit.handle}
                </p>
                {photo.caption && (
                  <p className="text-[11px] text-white/70">{photo.caption}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none fixed inset-x-0 top-6 flex flex-col items-center text-center text-white">
        <p className="font-mono text-xs text-white/50">Issue {issueNumber}</p>
        <p className="text-2xl font-serif">{theme}</p>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/70 backdrop-blur">
        {discovered.size}/{photos.length} discovered
      </div>

      <p className="pointer-events-none fixed bottom-4 left-4 font-mono text-xs text-white/40">
        Drag to explore
      </p>
    </div>
  );
}
