const STYLES: Record<string, { label: string; cls: string }> = {
  PLANNING: { label: "Planning", cls: "border-neutral-700 bg-neutral-900 text-neutral-300" },
  BRIEFING: { label: "Briefing", cls: "border-sky-800 bg-sky-950 text-sky-300" },
  ACTIVE: { label: "Active", cls: "border-green-800 bg-green-950 text-green-300" },
  DEBRIEFING: { label: "Debriefing", cls: "border-amber-800 bg-amber-950 text-amber-300" },
  COMPLETED: { label: "Completed", cls: "border-neutral-700 bg-neutral-900 text-neutral-400" },
  ARCHIVED: { label: "Archived", cls: "border-neutral-800 bg-neutral-950 text-neutral-600" },
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
