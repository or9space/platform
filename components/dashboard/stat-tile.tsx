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
      <p className="font-mono text-2xl font-bold tabular-nums text-neutral-100">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      {sub && <p className="text-xs text-neutral-600">{sub}</p>}
    </>
  );
  const base = "rounded border border-neutral-800 bg-neutral-900/40 p-4";
  return href ? (
    <a href={href} className={`${base} block transition-colors hover:border-neutral-600`}>
      {body}
    </a>
  ) : (
    <div className={base}>{body}</div>
  );
}
