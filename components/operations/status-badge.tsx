const STYLES: Record<string, { label: string; cls: string }> = {
  PLANNING: { label: "Planning", cls: "border-border-light bg-surface text-text-secondary" },
  BRIEFING: { label: "Briefing", cls: "border-info bg-surface-elevated text-info" },
  ACTIVE: { label: "Active", cls: "border-green-800 bg-green-950 text-green-300" },
  DEBRIEFING: { label: "Debriefing", cls: "border-amber bg-amber-soft text-amber" },
  COMPLETED: { label: "Completed", cls: "border-border-light bg-surface text-text-secondary" },
  ARCHIVED: { label: "Archived", cls: "border-border bg-surface text-text-muted" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? STYLES.PLANNING;
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STYLES).map(([k, v]) => [k, v.label]),
) as Record<string, string>;
