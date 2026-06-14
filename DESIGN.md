# DESIGN.md — or9.space marketing (brand register)

Committed visual system for the public marketing surfaces. Identity-driven, not a SaaS template. The aesthetic is an **operations dossier / dispatch board**: ruled, numbered, condensed-uppercase headings on a deep warm ink, one committed signal color (amber), cream type. Avoids both the sci-fi-neon and the dark-SaaS-red reflexes.

## Color strategy: COMMITTED

Amber is the brand. It carries CTAs, section numbers, rules, kickers, and key emphasis — well past the "one accent ≤10%" restraint rule, on purpose. Red is a sparing secondary (alerts/critical only). All neutrals are tinted warm (toward the amber hue), never pure black/white.

OKLCH tokens (define as CSS variables in `globals.css`):

```
--ink:        oklch(16% 0.012 70);   /* deep warm ink — page surface */
--ink-raised: oklch(21% 0.014 70);   /* raised panels, table headers */
--ink-line:   oklch(32% 0.014 70);   /* hairline rules / borders */
--cream:      oklch(94% 0.010 75);   /* primary text */
--muted:      oklch(70% 0.020 75);   /* secondary text */
--signal:     oklch(74% 0.150 75);   /* amber — the brand accent */
--signal-ink: oklch(20% 0.040 75);   /* text ON amber (dark, for CTA labels) */
--alert:      oklch(58% 0.190 25);   /* red — sparing, critical only */
```

Rules of use: amber for one or two words of emphasis per heading, section indices ("01"), the primary CTA fill, and hairline accents on active nav. Body stays cream. Never tint large text blocks amber. Never gradient-text.

## Typography

- **Display:** Oswald (condensed, 600–700), UPPERCASE for headlines, section kickers, nav wordmark. Tight tracking. This is the dispatch-board voice. Load via `next/font/google`.
- **Body:** Inter (or IBM Plex Sans), 400/500, 16–18px, line length 62–70ch. Clean grotesk, readable.
- **Mono accent (optional):** a mono for callsigns/coordinates/labels ("ORG.HQ", "v1 / FREE") — small, muted, uppercase. Use sparingly as texture.
- Scale: ≥1.3 ratio between steps. Hero ~clamp(2.75rem, 6vw, 4.5rem) Oswald 700. Section heads ~1.75rem Oswald 600. Body 1.0625rem Inter.

## Layout

- **Asymmetric, ruled, numbered.** No centered-hero-with-glow. Hero is left-weighted with a strong display headline + one proof line; a thin top rule + a "STATUS: LIVE" style dispatch strip is on-brand.
- **Features as a sequence, not a card grid.** Each feature is a numbered row (`01 / FORUMS`) with a one-line operational description and, where cheap, a tiny inline visual (a ruled mini-mock). Alternate alignment for rhythm. Absolutely no identical icon+heading+text card wall.
- Hairline rules (`--ink-line`) divide sections instead of boxes. Most things need no container.
- Vary vertical rhythm: generous around the hero, tighter in the feature ledger, open again at pricing/close.
- Pricing: a real two-column comparison (Free vs Hosted) built from the live flag matrix; ruled rows, amber checks, dash for absent. Not a pair of pricing cards with a glow.

## Motion

- Reveal-on-scroll for feature rows: opacity + small translateY, ease-out-expo, ~400ms, staggered. Respect `prefers-reduced-motion`.
- CTA hover: amber lightens one step (no scale bounce). Nav active underline draws in.
- Never animate layout props.

## Components (marketing)

- `MarketingNav` — wordmark in Oswald, hairline-bottom, amber active state, single amber CTA. Mobile: a simple disclosure, not a full-screen modal.
- `Hero` — left-weighted display headline (amber-emphasized key word), proof line ("Freedom Guard runs on it · open-source · live"), primary + secondary CTA, a dispatch top-strip.
- `FeatureLedger` — numbered feature rows (replaces the card grid).
- `PricingTable` — ruled Free/Hosted comparison from `buildPlanMatrix()`.
- `ProofBand` — open-source + real-org + cheap, as a ruled strip with concrete nouns.
- `Cta` / `MarketingFooter` — close on the idea; footer has the AGPL/GitHub line.

## Bans (enforced)

No `#000`/`#fff`, no gradient-text, no side-stripe borders, no glassmorphism, no hero-metric template, no identical card grid, no modal-first, no em dashes in copy.
