"use client";
import { useState } from "react";

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{ background: "var(--ink)", borderColor: "var(--ink-line)" }}
      className="sticky top-0 z-50 border-b"
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="/"
          className="font-display text-xl font-bold"
          style={{ color: "var(--cream)" }}
        >
          OR9.SPACE
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-7 text-sm md:flex">
          {[
            { href: "/features", label: "Features" },
            { href: "/pricing", label: "Pricing" },
            { href: "/orgs", label: "Orgs" },
            { href: "/about", label: "About" },
          ].map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                style={{ color: "var(--muted)" }}
                className="font-medium uppercase tracking-wide text-xs transition-colors hover:text-[color:var(--cream)]"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="/start-org"
          style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
          className="font-display hidden rounded px-5 py-2 text-sm font-semibold transition-colors hover:opacity-90 md:inline-block"
        >
          Start your org
        </a>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          style={{ color: "var(--muted)" }}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="font-display text-xs font-semibold tracking-widest">
            {open ? "CLOSE" : "MENU"}
          </span>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          style={{ background: "var(--ink-raised)", borderColor: "var(--ink-line)" }}
          className="border-t px-6 pb-4 md:hidden"
        >
          <ul className="flex flex-col gap-4 pt-4">
            {[
              { href: "/features", label: "Features" },
              { href: "/pricing", label: "Pricing" },
              { href: "/orgs", label: "Orgs" },
              { href: "/about", label: "About" },
            ].map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  style={{ color: "var(--muted)" }}
                  className="font-display text-sm font-semibold tracking-wide transition-colors hover:text-[color:var(--cream)]"
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/start-org"
                style={{ background: "var(--signal)", color: "var(--signal-ink)" }}
                className="font-display inline-block rounded px-5 py-2 text-sm font-semibold"
              >
                Start your org
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
