# Phase 4 — Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps. No security review tier (public marketing, no DB writes, no auth).

**Goal:** A real public marketing site for the or9.space product, rendered on the apex/hub host (non-tenant): a proper landing page (hero, value prop, feature grid, social proof, CTA), a `/features` page, a `/pricing` page (Free vs Paid comparison driven by the real feature-flag matrix), and a shared marketing chrome (nav + footer). Replaces the Phase-1 "Coming soon" placeholder. Public, no auth, no DB writes.

**Architecture:** Apex/hub host renders marketing (the root `app/page.tsx` already branches `getCurrentTenant() === null` → marketing; tenant host → tenant home). Build a `components/marketing/*` kit (Nav, Footer, Hero, FeatureGrid, PricingTable, CTA) + marketing routes. Pricing reads the real `FEATURE_FLAGS` (`defaultFree`/`defaultPaid`/`paidOnly`) so the comparison can't drift from the product. Everything is a server component (static-friendly); no client islands needed beyond a mobile-nav toggle if desired.

**Tech Stack:** Next 16, Tailwind v4. Reuses `lib/feature-flags.ts` (the flag matrix) for the pricing/features content. No Prisma, no actions, no RLS.

**Branch:** `feat/phase-4-marketing`.

**Scope cut:** blog/changelog, docs site, live demo embed, animated hero effects (keep tasteful CSS only), i18n, A/B testing. The actual provisioning funnel (`/start-org`) already exists from Phase 1 — marketing CTAs link to it; Phase 5 (hub) deepens it. No design-tool (impeccable) round in this pass — clean, on-brand, responsive marketing.

**Environment (every task):** `C:\Projects\platform`, Bash tool. Baseline tests green (confirm Task 0). Gates: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. Conventional commits, David Smereski, do NOT push. No migration/RLS/fuzzer (no DB). `gh` at `C:\Program Files\GitHub CLI\gh.exe`.

---

## File Structure
```
components/marketing/marketing-nav.tsx
components/marketing/marketing-footer.tsx
components/marketing/hero.tsx
components/marketing/feature-grid.tsx
components/marketing/pricing-table.tsx
components/marketing/cta.tsx
lib/marketing/features.ts        ← the feature content (title/blurb/icon per platform capability), + plan matrix derived from FEATURE_FLAGS
app/page.tsx                      ← REPLACE the no-tenant branch with the real landing (keep the tenant branch as-is for now)
app/(marketing)/layout.tsx        ← marketing chrome (nav + footer) for the marketing routes
app/(marketing)/features/page.tsx
app/(marketing)/pricing/page.tsx
app/about/page.tsx                ← keep/enhance if present
tests/unit/marketing.test.ts      ← assert the pricing matrix derives from FEATURE_FLAGS (no drift)
```
NOTE: `app/page.tsx` is the apex root and is NOT inside the `(marketing)` group; it should import + render the marketing components directly (Nav/Hero/FeatureGrid/CTA/Footer) for the no-tenant branch. The `(marketing)` route group wraps `/features` + `/pricing` with the shared nav/footer layout. Confirm `app/about` placement (move under `(marketing)` if it makes the nav consistent, or leave it and link to it).

---

## Task 0: Branch
- [ ] `git checkout main; git pull origin main; git checkout -b feat/phase-4-marketing`. `pnpm test` baseline (expected 233) green. Read `app/page.tsx`, `app/about/page.tsx` (if exists), `app/start-org/page.tsx`, `lib/feature-flags.ts`, `app/globals.css` (brand tokens/palette), and an existing styled page (e.g. a forums page) to learn the design tokens + neutral/tactical palette in use.

---

## Task 1: Marketing content model + pricing matrix (TDD)
**Files:** `lib/marketing/features.ts`, `tests/unit/marketing.test.ts`
- [ ] **Step 1:** Create `lib/marketing/features.ts`:
  - `MARKETING_FEATURES`: an array describing each platform capability for the public site — `{ key, name, blurb }` for forums, members & ranks, treasury, loot points, handbook, inventory, fleet, tournaments, integrations (curated copy; not just the flag labels).
  - `buildPlanMatrix()`: derives the Free-vs-Paid comparison rows from `FEATURE_FLAGS` (`lib/feature-flags.ts`) — for each flag, `{ key, label, free: defaultFree, paid: defaultPaid, paidOnly }`. This guarantees the pricing table matches the product config (no hand-maintained drift).
- [ ] **Step 2: Failing unit test `tests/unit/marketing.test.ts`:** assert `buildPlanMatrix()` returns one row per FEATURE_FLAGS entry, that a known free-default flag (`forums`) shows `free: true`, and a known paid-default flag (`fleet`) shows `free: false, paid: true`. Assert `MARKETING_FEATURES` is non-empty and every entry has name+blurb.
- [ ] **Step 3:** red → implement → green. lint + tsc clean.
- [ ] **Step 4: Commit** `feat(marketing): feature content + FEATURE_FLAGS-derived pricing matrix`

---

## Task 2: Marketing component kit
**Files:** `components/marketing/*.tsx`
- [ ] Build server components (Tailwind, responsive, on-brand using the existing palette/tokens; tasteful — strong hero, clear hierarchy, no exclamation-mark fluff):
  - `marketing-nav.tsx` — logo/wordmark "or9.space", links (Features, Pricing, About), a "Start your org" CTA button → `/start-org`, and a "Sign in" link. (Sign-in on the apex can link to `/login` — note: login resolves per-tenant, so on the apex it may just explain "sign in at your org's address"; keep the link simple or point to a help blurb. Use your judgment; document it.)
  - `marketing-footer.tsx` — wordmark, small nav, "open-source (AGPL)" note + GitHub link (github.com/or9space/platform), copyright.
  - `hero.tsx` — headline (the org-HQ value prop), subhead, primary CTA (Start your org) + secondary (See features). 
  - `feature-grid.tsx` — maps `MARKETING_FEATURES` into cards (name + blurb).
  - `pricing-table.tsx` — Free vs Paid columns; rows from `buildPlanMatrix()`; a check/dash per cell; CTA under each column.
  - `cta.tsx` — a closing call-to-action band → /start-org.
- [ ] Gates: `pnpm build` clean, `pnpm test` green, lint+tsc clean. Commit `feat(marketing): marketing component kit (nav/footer/hero/feature-grid/pricing-table/cta)`

---

## Task 3: Wire the pages
**Files:** `app/page.tsx` (no-tenant branch), `app/(marketing)/layout.tsx`, `app/(marketing)/features/page.tsx`, `app/(marketing)/pricing/page.tsx`, `app/about/page.tsx`
- [ ] **`app/page.tsx`** — REPLACE the no-tenant branch to render the full landing: `<MarketingNav/> <Hero/> <FeatureGrid/> <PricingTable/> <Cta/> <MarketingFooter/>`. KEEP the tenant branch (when `getCurrentTenant()` returns a tenant) exactly as it is (don't break tenant home). 
- [ ] **`app/(marketing)/layout.tsx`** — wraps `/features`, `/pricing` (and `/about` if moved) with `<MarketingNav/>` + children + `<MarketingFooter/>`.
- [ ] **`/features/page.tsx`** — full feature grid + deeper copy per capability.
- [ ] **`/pricing/page.tsx`** — the pricing table + a FAQ-ish note (free tier includes ads, paid removes them + unlocks paid-only flags). Pull paid-only flags from the matrix.
- [ ] **`/about/page.tsx`** — keep/refine: what or9.space is, open-core model, who it's for.
- [ ] Gates: `pnpm build` (routes `/`, `/features`, `/pricing`, `/about` — `/` stays dynamic [it branches on tenant], the marketing sub-routes can be static), `pnpm test` green, lint+tsc clean.
- [ ] **Live-verify locally** if convenient (the apex renders without a tenant host); otherwise rely on build. Commit `feat(marketing): landing + features + pricing + about pages`

---

## Task 4: Gate + PR + CI + deploy
- [ ] Full gate (test/lint/tsc/build; fuzzer unaffected — optional run). Push, PR (gh, --body-file). CI green. Light controller review (focus: no DB/secret access in marketing; pricing matrix derives from flags; tenant home branch untouched; responsive + on-brand). Deploy: pull, rebuild runtime image (NO migration), `docker compose up -d`. Verify the apex `https://or9.space/` renders the real landing; `/features` + `/pricing` render; a tenant host (`freedomguards.or9.space/`) still shows the tenant home (NOT the marketing site).

---

## Self-Review
**Spec coverage:** public landing + features + pricing + about ✓; pricing derived from FEATURE_FLAGS (no drift) ✓; apex-only (tenant home preserved) ✓; CTA → existing /start-org funnel ✓.
**Security:** marketing is public, no DB writes, no auth, no secrets; the tenant-vs-apex branch is unchanged so no tenant data renders on the apex.
**Deferrals:** blog/docs/demo-embed/i18n/animation.
**Type consistency:** `MARKETING_FEATURES`, `buildPlanMatrix()` typed; components are server components.

---
## Execution
Subagent-driven (sonnet codes). Light review (public frontend). Controller deploy after merge (no migration).
