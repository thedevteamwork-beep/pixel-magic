"use client";

import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";

/**
 * Lets a mouse drag a horizontal scroll rail, as a finger or trackpad can.
 * A drag never counts as a click on the card under it.
 */
export function useRailDrag(railRef: RefObject<HTMLElement | null>) {
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let startX: number | null = null;
    let startLeft = 0;

    const down = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      startX = event.clientX;
      startLeft = rail.scrollLeft;
      moved.current = false;
    };
    const move = (event: PointerEvent) => {
      if (startX === null) return;
      const distance = event.clientX - startX;
      if (!moved.current && Math.abs(distance) > 5) {
        moved.current = true;
        setDragging(true);
      }
      if (moved.current) rail.scrollLeft = startLeft - distance;
    };
    const up = () => {
      if (startX === null) return;
      startX = null;
      // Snapping comes back once the drag ends, which settles the rail on the nearest card.
      setDragging(false);
    };

    rail.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      rail.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [railRef]);

  /** Put on the rail: swallows the click that ends a drag. */
  function onClickCapture(event: MouseEvent) {
    if (!moved.current) return;
    event.preventDefault();
    event.stopPropagation();
    moved.current = false;
  }

  return { dragging, onClickCapture };
}
