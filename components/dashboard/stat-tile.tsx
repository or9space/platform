import type { ReactNode } from "react";

/** A single MFD-style readout tile: big mono value over a small label. */
export function StatTile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">{label}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </>
  );
  const base = "rounded border border-border bg-surface/40 p-4";
  return href ? (
    <a href={href} className={`${base} block transition-colors hover:border-primary`}>
      {body}
    </a>
  ) : (
    <div className={base}>{body}</div>
  );
}
