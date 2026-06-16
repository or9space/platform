import type { ReactNode } from "react";

/** Friendly empty/error state when UEX is unreachable or returns nothing. */
export function UexNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-amber bg-amber-soft p-4 text-sm text-amber">
      {children}
    </div>
  );
}

export function aUEC(n: number): string {
  if (!n) return "—";
  return `${n.toLocaleString("en-US")} aUEC`;
}

/** Run a UEX getter; on any error return a sentinel so the page can render a notice. */
export async function safeUex<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await fn() };
  } catch {
    return { ok: false };
  }
}
