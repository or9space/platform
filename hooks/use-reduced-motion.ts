"use client";

import { useEffect, useState } from "react";

/**
 * Track the user's `prefers-reduced-motion` setting.
 *
 * Use to gate JS-driven motion (SVG <animate>, canvas loops, framer-motion,
 * dnd transforms). For pure CSS animations, prefer `motion-reduce:` modifiers
 * or `@media (prefers-reduced-motion: reduce)` blocks instead — those work
 * without React.
 *
 * SSR-safe: returns `false` on the server and during the first client render,
 * then updates after mount via the effect.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}
