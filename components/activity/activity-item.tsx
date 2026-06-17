
interface ActivityEntry {
  kind: string;
  title: string;
  href: string;
  who?: string | null;
  when: Date;
}

interface ActivityItemProps {
  entry: ActivityEntry;
  timeAgo: (d: Date) => string;
}

export function ActivityItem({ entry, timeAgo }: ActivityItemProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-0 transition-colors hover:bg-surface-elevated">
      {/* Kind badge */}
      <span className="mfd-label shrink-0 rounded border border-border/60 bg-surface px-2 py-0.5 font-mono text-xs uppercase text-text-secondary">
        {entry.kind}
      </span>

      {/* Title link */}
      <a
        href={entry.href}
        className="min-w-0 flex-1 truncate text-sm text-text-primary hover:text-primary hover:underline"
      >
        {entry.title}
      </a>

      {/* Who · when */}
      <span className="mfd-label shrink-0 text-xs text-text-muted tabular-nums">
        {entry.who ? `${entry.who} · ` : ""}
        {timeAgo(entry.when)}
      </span>
    </li>
  );
}

export type { ActivityEntry };
