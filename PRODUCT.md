# PRODUCT.md — or9.space

> Authored from the full build context (the entire platform was built in this engagement), not from a single prompt. Refine with `/impeccable teach`.

## register
brand

(The marketing/landing surfaces are the product being sold. Tenant app UI is a separate `product` register.)

## Product purpose

or9.space is a configurable, multi-tenant headquarters platform for serious online orgs — built first for Star Citizen crews, generalizing to any community that runs operations together. One codebase, deployed per org as `<org>.or9.space`, each org isolated at the database level (row-level security). An org gets, out of the box: forums, a member roster with ranks, a treasury ledger, a loot-points economy, a versioned handbook, an asset inventory, a member fleet roster, tournaments, and Discord/Calendar integration — each one a feature flag the org turns on.

Open-core: the platform is AGPL and free to self-host. The hosted service adds billing, ads removal, custom domains, and a managed Discord bot.

## Users

- **Org leadership (the buyer).** A commander/officer running a 10–200 person crew off a tangle of Discord channels, Google Sheets, and a Carrd page. Technical enough to set up a Discord bot, not a developer. Wants one place that looks legitimate, that members will actually use, that they control. Decides in minutes whether this is "real" or another abandoned SaaS.
- **Members (the daily users).** Pilots who check ranks, read the handbook, log loot, sign up for ops. They judge the org partly by its HQ. If the HQ looks sharp, the org looks serious.
- **Self-hosters (the credibility multiplier).** Devs who run the AGPL build themselves. They make the project trustworthy and contribute back.

## What we're selling

Legitimacy and control, fast. The pitch is not "another community tool." It's: *your org gets a command HQ that looks like it was built for you, isolated and yours, running in minutes, free to start.* Proof points that must surface on the landing: real org already runs on it (Freedom Guard), open-source, genuinely cheap (free tier; hosted is low single-digit dollars), per-org isolation (RLS), nine real features not vaporware.

## Tone

Operational. Direct. Confident without hype. Reads like a field manual or a dispatch board, not a startup landing. Specific nouns over adjectives: "a treasury ledger with a running balance" beats "powerful financial tools." Earns trust by being concrete. Never breathless, never "revolutionize/seamless/unleash."

## Anti-references (do NOT look like these)

- Generic dark SaaS landing with a centered hero, a radial accent glow, and one accent color (this is the current state — reject it).
- Sci-fi neon-on-black "space game" UI (first category reflex).
- Navy + gold "enterprise/finance" trust theme.
- Identical 3-across feature cards with an icon, a heading, and a line of text.
- Hero-metric template (big number, small label, supporting stats).
- Crypto/observability dark-blue dashboards.

## Strategic principles

- The landing must pass the "is this real?" test in the first screen: a committed visual identity, a concrete claim, and one proof point above the fold.
- Show the product as a system of named, real features — tell a short story per feature, not a card wall.
- Lead with the org-leadership buyer; reassure the self-hoster with the open-source angle lower down.
- Pricing is honest and legible: free tier (ad-supported) vs hosted paid (cheap, ads off, extras). The feature matrix is derived from the real flag config, so it never lies.
- Every CTA goes to one place: start your org.
