import { formatPoints } from "@/lib/loot";

interface Props {
  rank: number;
  total: number;
  displayName: string;
  balanceTenths: number;
  memberId: string;
}

export function StandingBand({ rank, total, displayName, balanceTenths, memberId }: Props) {
  return (
    <section
      aria-label="Your standing"
      className="relative border border-border bg-surface-elevated/60 p-4 sm:p-6"
    >
      <p className="mfd-label text-text-muted">[ Your standing ]</p>

      <a
        href={`/loot/${memberId}`}
        className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between hover:opacity-90 transition-opacity"
      >
        <div className="flex items-end gap-5 sm:gap-7">
          <div>
            <p className="text-stencil text-text-muted text-xs">Rank</p>
            <p className="text-stencil text-5xl sm:text-6xl text-text-primary leading-none">
              #{rank}
            </p>
            <p className="text-stencil text-[10px] tracking-wider text-text-muted mt-1">
              of {total}
            </p>
          </div>

          <div>
            <p className="text-stencil text-text-muted text-xs">Balance</p>
            <p className="font-mono tabular-nums text-4xl sm:text-5xl font-bold text-primary leading-none">
              {formatPoints(balanceTenths)}
            </p>
            <p className="mt-1 text-xs text-text-muted">{displayName}</p>
          </div>
        </div>
      </a>
    </section>
  );
}
