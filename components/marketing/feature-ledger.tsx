"use client";
import { useEffect, useRef } from "react";
import { MARKETING_FEATURES } from "@/lib/marketing/features";

function RevealRow({
  index,
  name,
  blurb,
  delay,
}: {
  index: string;
  name: string;
  blurb: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("visible"), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className="reveal grid grid-cols-[3rem_1fr] gap-6 border-b py-6 sm:grid-cols-[4rem_12rem_1fr]"
      style={{ borderColor: "var(--ink-line)" }}
    >
      <span
        className="font-display text-2xl font-bold leading-none pt-0.5"
        style={{ color: "var(--signal)" }}
      >
        {index}
      </span>
      <span
        className="font-display text-base font-semibold self-start pt-0.5"
        style={{ color: "var(--cream)" }}
      >
        {name}
      </span>
      <span className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {blurb}
      </span>
    </div>
  );
}

export function FeatureLedger() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div
          className="mb-2 border-b pb-4"
          style={{ borderColor: "var(--ink-line)" }}
        >
          <h2
            className="font-display text-2xl font-bold"
            style={{ color: "var(--cream)" }}
          >
            Modules
          </h2>
        </div>
        {MARKETING_FEATURES.map((feature, i) => (
          <RevealRow
            key={feature.key}
            index={String(i + 1).padStart(2, "0")}
            name={feature.name}
            blurb={feature.blurb}
            delay={i * 60}
          />
        ))}
      </div>
    </section>
  );
}
