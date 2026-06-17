import { formatPoints } from "@/lib/loot";
import type { LootMemberBalance } from "@/lib/queries/loot";

interface Props {
  members: LootMemberBalance[];
  viewerMembershipId: string | null | undefined;
}

export function LeaderboardCollapsible({ members, viewerMembershipId }: Props) {
  return (
    <details className="group border border-border bg-surface" aria-label="All standings">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
        <span className="mfd-label text-text-muted">
          [ All standings ]{" "}
          <span className="ml-1 font-mono text-text-secondary">{members.length}</span>
        </span>
        <span className="text-xs text-text-muted group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <ol className="divide-y divide-border/60 border-t border-border/60">
        {members.map((m, i) => {
          const isMe = m.membershipId === viewerMembershipId;
          return (
            <li
              key={m.id}
              className={
                isMe
                  ? "flex items-center justify-between gap-3 px-4 py-2 bg-primary/15"
                  : "flex items-center justify-between gap-3 px-4 py-2"
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={
                    "font-mono tabular-nums text-xs w-8 text-right " +
                    (isMe ? "text-primary font-bold" : "text-text-muted")
                  }
                >
                  #{i + 1}
                </span>
                <a
                  href={`/loot/${m.id}`}
                  className={
                    "truncate text-sm " +
                    (isMe
                      ? "text-primary font-semibold"
                      : "text-text-primary hover:text-primary")
                  }
                >
                  {m.displayName}
                </a>
              </div>
              <span
                className={
                  "font-mono tabular-nums text-sm font-semibold " +
                  (isMe ? "text-primary" : "text-text-primary")
                }
              >
                {formatPoints(m.balanceTenths)}
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
