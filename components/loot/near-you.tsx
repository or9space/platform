import { formatPoints } from "@/lib/loot";

export interface NearYouRow {
  id: string;
  displayName: string;
  membershipId: string | null;
  balanceTenths: number;
  rank: number;
  isMe: boolean;
}

interface Props {
  rows: NearYouRow[];
}

export function NearYou({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Members near you in the standings" className="space-y-2">
      <p className="mfd-label text-text-muted">[ Near you ]</p>
      <ol className="divide-y divide-border/60 border-y border-border/60">
        {rows.map((r) => (
          <li
            key={r.id}
            className={
              r.isMe
                ? "flex items-center justify-between gap-3 px-3 py-2.5 bg-primary/15"
                : "flex items-center justify-between gap-3 px-3 py-2.5"
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={
                  "font-mono tabular-nums text-xs w-8 text-right " +
                  (r.isMe ? "text-primary font-bold" : "text-text-muted")
                }
              >
                #{r.rank}
              </span>
              <a
                href={`/loot/${r.id}`}
                className={
                  "truncate text-sm " +
                  (r.isMe
                    ? "text-primary font-semibold"
                    : "text-text-primary hover:text-primary")
                }
              >
                {r.isMe ? "You" : r.displayName}
              </a>
            </div>
            <span
              className={
                "font-mono tabular-nums text-sm font-semibold " +
                (r.isMe ? "text-primary" : "text-text-primary")
              }
            >
              {formatPoints(r.balanceTenths)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
