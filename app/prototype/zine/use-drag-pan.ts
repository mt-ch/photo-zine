"use client";

// PROTOTYPE — minimal pointer-drag panning, no inertia/momentum.
// Answers "does a drag-to-explore canvas feel right", not "is this the final feel".

import { useCallback, useRef, useState } from "react";

export function useDragPan() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      start.current = { x: e.clientX, y: e.clientY };
      startOffset.current = offset;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [offset],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setOffset({
      x: startOffset.current.x + (e.clientX - start.current.x),
      y: startOffset.current.y + (e.clientY - start.current.y),
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return {
    offset,
    dragging: dragging.current,
    bind: { onPointerDown, onPointerMove, onPointerUp },
  };
}

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
