const STYLES: Record<string, { label: string; cls: string }> = {
  OP: { label: "Op", cls: "border-danger bg-surface text-fg-red-light" },
  MEETING: { label: "Meeting", cls: "border-info bg-surface-elevated text-info" },
  TRAINING: { label: "Training", cls: "border-green-800 bg-green-950 text-green-300" },
  SOCIAL: { label: "Social", cls: "border-border-light bg-surface text-text-secondary" },
  TOURNAMENT: { label: "Tournament", cls: "border-amber bg-amber-soft text-amber" },
  OTHER: { label: "Other", cls: "border-border-light bg-surface text-text-secondary" },
};

export function EventTypeBadge({ type }: { type: string }) {
  const s = STYLES[type] ?? STYLES.OTHER;
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
