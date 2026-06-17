const STYLES: Record<string, { label: string; cls: string }> = {
  ANNOUNCEMENT: { label: "Announcement", cls: "border-danger bg-surface text-fg-red-light" },
  PATCH_NOTES: { label: "Patch notes", cls: "border-info bg-surface-elevated text-info" },
  COMMUNITY: { label: "Community", cls: "border-green-800 bg-green-950 text-green-300" },
  GUIDE: { label: "Guide", cls: "border-amber bg-amber-soft text-amber" },
};

export function CategoryBadge({ category }: { category: string }) {
  const s = STYLES[category] ?? STYLES.ANNOUNCEMENT;
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
