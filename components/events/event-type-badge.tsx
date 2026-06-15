const STYLES: Record<string, { label: string; cls: string }> = {
  OP: { label: "Op", cls: "border-red-800 bg-red-950 text-red-300" },
  MEETING: { label: "Meeting", cls: "border-sky-800 bg-sky-950 text-sky-300" },
  TRAINING: { label: "Training", cls: "border-green-800 bg-green-950 text-green-300" },
  SOCIAL: { label: "Social", cls: "border-neutral-700 bg-neutral-900 text-neutral-300" },
  TOURNAMENT: { label: "Tournament", cls: "border-amber-800 bg-amber-950 text-amber-300" },
  OTHER: { label: "Other", cls: "border-neutral-700 bg-neutral-900 text-neutral-400" },
};

export function EventTypeBadge({ type }: { type: string }) {
  const s = STYLES[type] ?? STYLES.OTHER;
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
