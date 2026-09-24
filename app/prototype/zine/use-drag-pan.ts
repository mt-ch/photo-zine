"use client";

// PROTOTYPE — pointer-drag panning with release inertia (velocity capture +
// friction decay via rAF). Answers "does drag-to-explore feel award-level",
// not a finished physics model.

import { useCallback, useEffect, useRef, useState } from "react";

const FRICTION = 0.94;
const MIN_VELOCITY = 0.02;

export function useDragPan() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastMove = useRef({ x: 0, y: 0, t: 0 });
  const rafId = useRef<number | null>(null);

  const setOffsetBoth = useCallback((next: { x: number; y: number }) => {
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const stopInertia = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const runInertia = useCallback(() => {
    const step = () => {
      velocity.current = {
        x: velocity.current.x * FRICTION,
        y: velocity.current.y * FRICTION,
      };
      if (
        Math.abs(velocity.current.x) < MIN_VELOCITY &&
        Math.abs(velocity.current.y) < MIN_VELOCITY
      ) {
        rafId.current = null;
        return;
      }
      setOffsetBoth({
        x: offsetRef.current.x + velocity.current.x,
        y: offsetRef.current.y + velocity.current.y,
      });
      rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  }, [setOffsetBoth]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      stopInertia();
      dragging.current = true;
      start.current = { x: e.clientX, y: e.clientY };
      startOffset.current = offsetRef.current;
      lastMove.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      velocity.current = { x: 0, y: 0 };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [stopInertia],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const now = performance.now();
      const dt = Math.max(now - lastMove.current.t, 1);
      velocity.current = {
        x: ((e.clientX - lastMove.current.x) / dt) * 16,
        y: ((e.clientY - lastMove.current.y) / dt) * 16,
      };
      lastMove.current = { x: e.clientX, y: e.clientY, t: now };
      setOffsetBoth({
        x: startOffset.current.x + (e.clientX - start.current.x),
        y: startOffset.current.y + (e.clientY - start.current.y),
      });
    },
    [setOffsetBoth],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      runInertia();
    },
    [runInertia],
  );

  useEffect(() => stopInertia, [stopInertia]);

  return {
    offset,
    dragging: dragging.current,
    bind: { onPointerDown, onPointerMove, onPointerUp },
  };
}

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
