import type { ReactNode } from "react";

/** A bracketed-header content panel matching the tactical readout aesthetic. */
export function Panel({
  title,
  href,
  linkLabel = "View all",
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded border border-neutral-800">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-400">[ {title} ]</h2>
        {href && (
          <a href={href} className="text-xs text-neutral-500 transition-colors hover:text-neutral-200">
            {linkLabel} →
          </a>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
