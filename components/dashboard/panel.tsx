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
    <section className="rounded border border-border">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-text-secondary">[ {title} ]</h2>
        {href && (
          <a href={href} className="text-xs text-text-muted transition-colors hover:text-text-primary">
            {linkLabel} →
          </a>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
