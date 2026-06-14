"use client";
import { useEffect, useRef, useState } from "react";

// Illustrative figures representing a real org running on the platform.
// These are representative data points, not live metrics.
const TILES = [
  { label: "MEMBERS", figure: "142", sub: "ACTIVE ROSTER" },
  { label: "TREASURY", figure: "+18,420", sub: "aUEC THIS CYCLE" },
  { label: "LOOT LEADER", figure: "VeganAmigo", sub: "240 PTS" },
  { label: "TOURNAMENTS", figure: "2", sub: "OPEN NOW" },
  { label: "FLEET", figure: "37", sub: "SHIPS REGISTERED" },
  { label: "FORUMS", figure: "19", sub: "THREADS TODAY" },
] as const;

function useVisibleOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // Read preference once on mount (server renders as visible for no-JS fallback)
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const el = ref.current;
    if (!el) return;

    // If motion is reduced, reveal immediately without animation
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible, reducedMotion };
}

export function StatusBoard() {
  const { ref, visible, reducedMotion } = useVisibleOnScroll();

  const boardTransition = reducedMotion
    ? undefined
    : "opacity 500ms cubic-bezier(0.16,1,0.3,1), transform 500ms cubic-bezier(0.16,1,0.3,1)";

  function tileTransition(i: number) {
    if (reducedMotion) return undefined;
    return `opacity 400ms ${80 + i * 55}ms cubic-bezier(0.16,1,0.3,1), transform 400ms ${80 + i * 55}ms cubic-bezier(0.16,1,0.3,1)`;
  }

  return (
    <div
      ref={ref}
      style={{
        border: "1px solid var(--ink-line)",
        background: "var(--ink-raised)",
        opacity: visible ? 1 : 0,
        transform: visible || reducedMotion ? "translateY(0)" : "translateY(16px)",
        transition: boardTransition,
      }}
    >
      {/* Board header strip */}
      <div
        style={{
          borderBottom: "1px solid var(--ink-line)",
          background: "var(--ink)",
          padding: "0.55rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <span
          className="font-mono text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--signal)" }}
        >
          OR9.SPACE
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--ink-line)" }}>//</span>
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          ORG.HQ
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--ink-line)" }}>//</span>
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          STATUS: LIVE
        </span>
        <span
          className="font-mono text-xs uppercase tracking-widest ml-auto"
          style={{ color: "var(--ink-line)" }}
        >
          FREEDOM GUARD // FG-001
        </span>
      </div>

      {/* Tile grid -- 3 cols, gap-px trick over --ink-line background creates hairline rules */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px",
          background: "var(--ink-line)",
        }}
      >
        {TILES.map((tile, i) => (
          <div
            key={tile.label}
            style={{
              background: "var(--ink-raised)",
              padding: "0.875rem 1rem",
              opacity: visible ? 1 : 0,
              transform: visible || reducedMotion ? "none" : "translateY(8px)",
              transition: tileTransition(i),
            }}
          >
            <div
              className="font-mono text-xs uppercase tracking-widest mb-1.5"
              style={{ color: "var(--muted)" }}
            >
              {tile.label}
            </div>
            <div
              className="font-display font-bold leading-none"
              style={{
                color: "var(--signal)",
                fontSize: tile.figure.length > 6 ? "1.05rem" : "1.6rem",
              }}
            >
              {tile.figure}
            </div>
            <div
              className="font-mono text-xs uppercase tracking-wider mt-1"
              style={{ color: "var(--ink-line)" }}
            >
              {tile.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Board footer -- honest caption + live badge */}
      <div
        style={{
          borderTop: "1px solid var(--ink-line)",
          padding: "0.4rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "var(--ink-line)" }}
        >
          Illustrative. One real org runs on this now.
        </span>
        <span
          className="font-mono text-xs font-semibold uppercase tracking-widest shrink-0"
          style={{ color: "var(--signal)", opacity: 0.7 }}
        >
          LIVE
        </span>
      </div>
    </div>
  );
}
