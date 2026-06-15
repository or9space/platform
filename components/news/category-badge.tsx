const STYLES: Record<string, { label: string; cls: string }> = {
  ANNOUNCEMENT: { label: "Announcement", cls: "border-red-800 bg-red-950 text-red-300" },
  PATCH_NOTES: { label: "Patch notes", cls: "border-sky-800 bg-sky-950 text-sky-300" },
  COMMUNITY: { label: "Community", cls: "border-green-800 bg-green-950 text-green-300" },
  GUIDE: { label: "Guide", cls: "border-amber-800 bg-amber-950 text-amber-300" },
};

export function CategoryBadge({ category }: { category: string }) {
  const s = STYLES[category] ?? STYLES.ANNOUNCEMENT;
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
