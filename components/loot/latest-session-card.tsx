import { Coins } from "lucide-react";

interface Session {
  id: string;
  label: string;
  sessionDate: Date;
  notes: string | null;
}

interface Props {
  session: Session | null;
  totalMembers: number;
  topBalance: number | null;
  formatPoints: (tenths: number) => string;
}

export function LatestSessionCard({ session, totalMembers, topBalance, formatPoints }: Props) {
  if (!session) {
    return (
      <aside aria-label="Pool stats" className="border border-border bg-surface p-4">
        <p className="mfd-label text-text-muted">[ Latest session ]</p>
        <p className="mt-2 text-sm text-text-muted">No sessions yet.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Pool stats" className="border border-border bg-surface p-4">
      <p className="mfd-label text-text-muted">[ Latest session ]</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-stencil text-lg text-text-primary">{session.label}</p>
        <span className="font-mono tabular-nums text-sm text-text-secondary">
          {session.sessionDate.toLocaleDateString()}
        </span>
      </div>
      {session.notes && (
        <p className="mt-2 text-xs text-text-secondary">{session.notes}</p>
      )}
      <p className="mt-4 mfd-label text-text-muted">Pool</p>
      <ul className="mt-1 space-y-1">
        <li className="flex items-center justify-between gap-2 text-sm">
          <span className="text-text-secondary">Participants</span>
          <span className="font-mono tabular-nums text-xs text-primary">{totalMembers}</span>
        </li>
        {topBalance !== null && (
          <li className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-secondary">Top balance</span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-xs text-primary">
              <Coins className="h-3 w-3" />
              {formatPoints(topBalance)}
            </span>
          </li>
        )}
      </ul>
    </aside>
  );
}
