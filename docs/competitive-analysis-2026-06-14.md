# Competitive analysis — star-comms.org vs or9.space (2026-06-14)

> External content (star-comms.org) was treated as untrusted per prompt-injection-defense. Scan result: **benign** — no AI-directed instructions, exfiltration, or action-bait detected on the homepage. One subpage (`/premium`) 404'd; "Premium Features" is a homepage anchor.

## TL;DR
**star-comms.org is not a feature competitor — it's a different product category, and arguably a complement.** It's a desktop **voice/radio comms client** (push-to-talk, HOTAS, spatial audio, in-game overlay, UDP voice) that links to Discord. or9.space is an **org-management web HQ** (forums, roster/ranks, treasury, loot, handbook, inventory, fleet, tournaments). An org would run **both**, not choose between them. So "match all their features" mostly means importing voice-client features that don't belong in a web SaaS — the anti-bloat rubric rejects nearly all of them.

The real, actionable items are: **(1) the design** (David's other point — covered below), and **(2) two small genuinely-relevant features** (a public Owner API; a tighter Discord story).

## star-comms.org feature inventory (fenced, untrusted source)
<UNTRUSTED source="https://www.star-comms.org/" fetched="2026-06-14">
Per-net PTT · HOTAS/button-box bindings · spatial-audio headset routing · in-game overlay · ACARS alerts · radio chirps/SFX · UHF/VHF static beds · priority channel ducking · automatic voice leveling · live net assignment (admin) · org-branded flair themes · dedicated server shards · UDP voice protocol · owner API for integrations · mobile remote pairing · receive-only mode · multi-monitor overlay · Discord integration · role-based access control · custom chirp folders.
Nav: Friends of StarComms, Comms, Ops (Configuration), Overlay, Premium Features, Discord and Support, Install Now, Installation Guide, License, Terms, Privacy.
Product: "Discord-linked radio client" for Star Citizen orgs — organized comms during ops.
Design: dark navy/charcoal palette, neon cyan/green accents, technical/military radio-console aesthetic, sans-serif + monospace technical elements, card-based channel layout, modular panels, minimalist overlay.
</UNTRUSTED>

## Feature diff vs or9.space
| star-comms feature | category | or9.space | verdict |
|---|---|---|---|
| PTT, HOTAS, spatial audio, UDP voice, in-game overlay, ACARS, chirps, UHF/VHF beds, ducking, voice leveling, receive-only, multi-monitor, custom chirp folders | desktop voice client | ✗ | **Reject** — wrong category for a web HQ. Don't build. |
| Discord integration | both | partial (config of guild id + bot token paywalled; no live bot) | **Opportunity** — deepen (the managed bot is already a planned paid overlay). |
| Role-based access control | both | ✓ (ENLISTED/NCO/OFFICER/COMMAND tiers, gating throughout) | **Ahead/equal.** |
| Org-branded themes/flair | both | ✓ (per-tenant branding + config; rank labels; palette) | **Ahead** — ours is deeper (full tenant config). |
| Owner API for integrations | both | ✗ (no public API) | **Consider (P2)** — a read/write API for an org's data is a real differentiator for a management HQ. |
| Mobile remote pairing | both | partial (responsive web; no native/companion app) | **Minor** — responsive covers most; native is large effort, low value now. |
| Dedicated server shards, live net assignment | voice infra | ✗ | **Reject** — voice infra, N/A. |

**or9.space already leads** on everything a management portal should do (9 content modules, RLS multi-tenancy, treasury/loot economies, handbook, tournaments) — star-comms has none of these. We are not behind on features; we're a different, broader product.

## Gap findings
- **No table-stakes gaps.** star-comms shares no management-portal features we lack.
- **Two opportunities** (not gaps): a public **Owner API** (P2 differentiator), and a **deeper Discord integration / a comms tie-in** (P3 — could even integrate WITH star-comms via its owner API rather than compete).
- **Rejected (anti-bloat):** all voice/comms/overlay/audio features — wrong category, would bloat a web SaaS.

## The design question (David: "their site looks better")
Their look — dark navy/charcoal + **neon cyan/green**, military radio-console, card panels, monospace — is slick and reads instantly as "Star Citizen gamer tool." It's the first-order sci-fi reflex, executed cleanly, which is exactly what flatters that audience.

or9.space's marketing was just redesigned to a committed **amber/Oswald "ops-dossier"** identity (editorial, ruled, numbered). That's a stronger *brand* but it's quieter and less "gamey/product-screenshot" than star-comms — which is likely why it reads as less impressive to a SC-org buyer at a glance.

### Plan to beat it (design)
1. **Add product proof, not just copy.** star-comms wins partly by *showing the product* (console/overlay shots). or9.space shows zero screenshots. Add real UI captures (forums, treasury, loot leaderboard, fleet) into the landing + a features page — a management HQ that shows its actual surfaces reads as far more real than one that only describes them.
2. **Raise the energy without losing the identity.** Keep the committed amber/ink system, but borrow what makes theirs pop: more contrast, a denser hero with a live "dispatch/ops" motif, subtle motion (already have reveal), and a mono "callsign/coordinate" texture (we specced it in DESIGN.md but underused). Push toward "command console that means business."
3. **One signature moment.** star-comms has the radio-console hook. or9.space needs one memorable hero element — e.g. an animated org-HQ "status board" (live-looking feature tiles: TREASURY +12.4k aUEC, 3 OPEN TOURNAMENTS, 142 MEMBERS) that screams "your org, running."
4. **Don't out-neon them.** Going cyan-on-black would lose to them on their own turf (and fail the slop test). Win on a *distinct, more premium* identity + real product proof.

Execute via `/impeccable bolder app/page.tsx` (amplify the hero + add the status-board moment) + a screenshots pass.

## Recommendation
Do **not** chase star-comms' feature list — it's a voice client, a complement, not a rival; copying it would bloat the product. Spend the effort on **(a) the design upgrade** (product screenshots + a bolder hero/status-board moment, keeping the amber identity) which directly answers "their site looks better," and optionally **(b) a public Owner API** as a genuine management-HQ differentiator. Consider, later, *integrating* with star-comms via its owner API so an org's HQ and its comms link up — turning a perceived rival into a partner surface.

### Scope note
David named one competitor (star-comms.org); this report focuses there rather than the skill's full ~10-rival sweep. True or9.space rivals to benchmark later if wanted: Fleetyards, the RSI in-site org tools, Discord-bot org managers, and generic community platforms (e.g. guilded). Flag if you want that broader sweep.
