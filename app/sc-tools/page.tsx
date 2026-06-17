import { uexTokenConfigured } from "@/lib/uex/client";
import { LayoutGrid } from "lucide-react";
import { MfdPanel } from "@/components/ui/mfd";

const CARDS = [
  { href: "/sc-tools/prices", title: "Commodity Prices", desc: "Live buy/sell prices for any commodity across every terminal." },
  { href: "/sc-tools/compare", title: "Price Compare", desc: "Best place to buy vs. best place to sell — the spread, at a glance." },
  { href: "/sc-tools/trade", title: "Trade Routes", desc: "Most profitable hauls right now, ranked by profit and ROI." },
  { href: "/sc-tools/hangar", title: "Hangar", desc: "Browse the full ship catalog with cargo, crew and specs." },
  { href: "/sc-tools/loadouts", title: "Ship Prices", desc: "Where to buy or rent a ship, and for how much." },
  { href: "/sc-tools/logistics", title: "Logistics", desc: "Every trade terminal by system and planet." },
  { href: "/sc-tools/industry", title: "Industry", desc: "Mining & refining — minerals, raw ores and refined goods." },
  { href: "/sc-tools/starmap", title: "Star Map", desc: "Systems, planets and moons of the 'verse." },
];

export default function ScToolsHub() {
  const tokened = uexTokenConfigured();
  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <LayoutGrid className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">SC TOOLS</h1>
          <p className="text-sm text-text-muted">
            Live Star Citizen market &amp; ship data, powered by{" "}
            <a href="https://uexcorp.space" className="underline hover:text-text-primary" target="_blank" rel="noreferrer">UEX Corp</a>.
          </p>
        </div>
      </div>
      <MfdPanel title={<span>[ TOOLS ]</span>} chassis="neutral">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <a key={c.href} href={c.href} className="block mfd-cut-tl-br border border-border p-4 transition-colors hover:border-primary">
              <p className="font-semibold text-text-primary">{c.title}</p>
              <p className="mt-1 text-sm text-text-muted">{c.desc}</p>
            </a>
          ))}
        </div>
      </MfdPanel>
      <p className="text-xs text-text-muted">
        Data source: UEX Corp API 2.0 · cached 10 min (prices) / 24 h (catalogs)
        {tokened ? " · application token active" : " · using public access (set UEX_API_TOKEN for higher limits)"}
      </p>
    </div>
  );
}
