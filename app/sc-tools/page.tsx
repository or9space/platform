import { uexTokenConfigured } from "@/lib/uex/client";

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
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">SC Tools</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Live Star Citizen market &amp; ship data, powered by{" "}
          <a href="https://uexcorp.space" className="underline hover:text-neutral-200" target="_blank" rel="noreferrer">UEX Corp</a>.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <a key={c.href} href={c.href} className="block rounded border border-neutral-800 p-4 transition-colors hover:border-neutral-600">
            <p className="font-semibold text-neutral-100">{c.title}</p>
            <p className="mt-1 text-sm text-neutral-400">{c.desc}</p>
          </a>
        ))}
      </div>
      <p className="text-xs text-neutral-600">
        Data source: UEX Corp API 2.0 · cached 10 min (prices) / 24 h (catalogs)
        {tokened ? " · application token active" : " · using public access (set UEX_API_TOKEN for higher limits)"}
      </p>
    </main>
  );
}
