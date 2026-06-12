# or9.space — multi-tenant SC org platform — program-level design

**Date**: 2026-06-11
**Status**: design accepted; ready for writing-plans
**Authors**: David Smereski + brainstorm session w/ Claude
**Supersedes**: nothing (greenfield program)

This is the program-level vision doc. It captures locked decisions, the architecture, and the phase split. Each phase becomes its own brainstorm → plan → build cycle. The doc lives in the FG repo for now and moves to the new `or9space/platform` repo when that exists in Phase 0.

---

## 1. Vision

`or9.space` is a multi-tenant SaaS that lets a Star Citizen org operate its own community HQ — forums, handbook, sign-offs, loot points, inventory, treasury, fleet, tournaments — without rebuilding anything. The Freedom Guard site we just shipped is the prototype; this is its production form, generalised so any SC org can spin up a `<slug>.or9.space` and configure it to fit their culture.

The product targets Star Citizen orgs specifically. Marketing copy and feature set are SC-shaped.

A hosted tier on `or9.space` is the primary revenue path. The platform is also open-sourced under AGPL-3.0 so anyone can self-host the core; the hosted tier earns by selling convenience (billing, ads-off, custom domains, managed Discord bot, automated provisioning, monitoring).

---

## 2. Locked decisions

15 upstream questions resolved during the brainstorm. The full reasoning lives in the conversation; this table is the authoritative summary.

| # | Topic | Decision | Notes |
|---|---|---|---|
| Q1 | Business model | Freemium + ads | Free tier ad-supported, paid tier ads-off + premium features. Stripe in Phase 7. |
| Q2 | Customer scope | Star Citizen orgs only | ICP narrow. Marketing copy + feature set are SC-shaped. |
| Q3 | Tenant isolation | Single DB, row-level `tenant_id` column | RLS policies + ESLint lint rule + tenant-leak fuzzer as belt + suspenders. |
| Q4 | Config storage | Hybrid: git defaults + DB per-tenant overrides | Git holds the schema + plan defaults; DB holds tenant edits made via admin UI. |
| Q5 | Tenant sovereignty | Export free, custom domain paid | Note: revisit toward "custom domain free at any tier" once paid value prop has 2+ stronger hooks. |
| Q6 | Hub purpose | Marketing + tenant directory | Future: add cross-org identity (Q6=C) later. Schema shaped for it from day 1. |
| Q7 | Tech stack | Next 16 + Prisma + Supabase + Tailwind + NextAuth | Same as FG. `db.ts` indirection so DB host swap (Supabase → Neon → self-hosted) is a deploy-config change. |
| Q8 | Open source | Open core, AGPL-3.0 | Core is OSS, premium features in a private overlay repo. |
| Q9 | FG migration | Defer | Build platform with `demo` + first new tenant; migrate FG in Phase 6 after platform stabilises. FG repo enters bug-fix-only freeze at Phase 6 cutover, not before — new FG-shaped features land in platform from the Phase 3 sub-phase that introduces them. |
| Q10 | v1 scope vs program scope | v1 = FG-parity + fleet + tournaments. Program = 10 more items queued | See Section 7 in this doc for the full split. |
| Q11 | Provisioning | Self-serve signup + manual approval | v2 upgrade to full auto-provisioning. |
| Q12 | SSL strategy | Cloudflare in front of origin | CF Free tier covers v1. CF Tunnel between CF and VPS origin. Note: origin is a $5/mo VPS, not Vercel (see Section 7). |
| Q13 | Identity | Per-tenant memberships now, designed for global cross-tenant identity later | `account` table global, `membership` table tenant-scoped. v1 enforces 1 membership per account at app layer. |
| Q14 | Feature flags | Per-tenant flags in config | 10 v1 flags: forums, handbook, loot, inventory, treasury, fleet, tournaments, calendar.googleIntegration, discord.bot, ads. |
| Q15 | Content modeling | Rigid 25 types + ≤3 tenant-defined custom fields per eligible type | "A+" — closed core types, structured extension hooks. |
| Q16 | Support | In-platform tickets at `support.or9.space` | Auth-required, Resend free tier email, admin triage at `admin.or9.space/support`. |

---

## 3. Architecture — request topology

Single Next app serves every tenant. Tenant identity is a request-time value (resolved by middleware from the Host header), not a build-time value.

```
                          DNS (CF Free)
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
  *.or9.space             custom domains          (special subdomains)
  → CF edge               (e.g. freedomguards     or9.space root
                          .space) via CF SSL-    demo.or9.space
                          for-SaaS               admin.or9.space  ← you-only
                                                  support.or9.space
                                  │
                                  ▼
                              CF edge (Free tier)
                                  │
                                  ▼
                  Hetzner CX22 VPS via CF Tunnel
                  ($5–6/mo) — Docker Compose stack:
                    - next-app   (Node 20, Next 16)
                    - discord-bot (long-running)
                    - cron       (provisioning, polling)
                                  │
                                  ▼
                          Supabase Postgres
                  (tenant-scoped tables RLS-protected +
                   global tables + support tables)
                                  │
                                  ▼
                        CF R2 Storage (Free 10 GB)
                                  │
                                  ▼
                Resend (Free 3k emails/mo, verified or9.space)
```

**Key flows:**

- **Subdomain request** (`freedomguards.or9.space/forums`): browser → CF edge (SSL, DDoS, cache check) → CF Tunnel → VPS Next app → middleware reads `x-or9-tenant` header (set by CF Worker from Host) → loads tenant + config → checks `forums.enabled` flag → renders.
- **Custom domain request** (`freedomguards.space/forums`): CF SSL-for-SaaS resolves the custom hostname → same path from the CF edge onwards. Custom-domain attach is a CF API call + a `tenant.custom_domain` row.
- **Cross-tenant isolation**: every tenant-scoped table has `tenant_id NOT NULL`. Supabase RLS policy `USING (tenant_id = current_setting('app.tenant_id', true)::text)` enforces at the DB. The Next middleware sets `app.tenant_id` per request via `SET LOCAL` on the Supabase connection pooler. Even if a route handler forgets the filter, RLS blocks the row. ESLint custom rule `no-untenanted-query` blocks the code from compiling if a Prisma call bypasses the `db(tenantCtx)` helper.

---

## 4. Data model

Three layers: **global**, **tenant-scoped**, **support**. Every table belongs to exactly one layer.

### Global (no `tenant_id`)

- `account` — global identity (email, password hash, OAuth, name, avatar). Shared across tenants (forward path to Q6=C cross-org identity).
- `account_oauth` — Discord/Google tokens.
- `tenant` — one row per live tenant. `(id, slug, name, plan, status, custom_domain, created_at)`.
- `pending_tenant` — sign-up queue, awaits manual approval.
- `tenant_config` — per-tenant DB overrides on top of git defaults.
- `tenant_feature_flag` — per-tenant flag overrides on top of plan defaults.
- `membership` — `(account_id, tenant_id, username, display_name, rank_id, joined_at)`. v1 enforces 1 per account at app layer; DB has no such constraint.
- `ad_slot`, `ad_creative` — house ad inventory + serving.

### Tenant-scoped (`tenant_id NOT NULL`, RLS-protected)

- Forums: `forum_category`, `forum_thread`, `forum_post`.
- Handbook: `handbook`, `handbook_section`, `signoff_category`, `signoff_item`, `signoff_signature`, `handbook_ack`.
- Loot: `loot_member`, `loot_session`, `loot_attendance`, `loot_transaction`.
- Inventory: `org_item_catalog`, `org_item_instance`, `org_item_event`, `org_item_loan`, `personal_org_item_entry`, `org_item_request`.
- Treasury: `treasury_entry`, `treasury_category`.
- Fleet (new): `ship`, `hangar_slot`.
- Tournaments (new): `tournament`, `tournament_bracket`, `tournament_registration`.
- Custom fields (Q15 A+): `custom_field_def` (per-tenant defs), `custom_field_value` (per-record values).
- Roles + audit: `rank`, `user_rank`, `notification`, `audit_log`.

### Support (global, not tenant-scoped)

- `support_ticket` — `(id, account_id, tenant_context_id NULL ok, subject, status, priority, created_at, closed_at)`.
- `support_message` — `(ticket_id, account_id, body, is_admin_reply, created_at)`.

### Key invariants

1. Tenant scope is structural. Every tenant-scoped table has `tenant_id NOT NULL`. No soft tenancy.
2. RLS policy is shared — one SQL template applied to every tenant-scoped table.
3. Direct `prisma.*` calls are forbidden. Only `db(tenantCtx).*` (auto-injects filter + sets RLS context). ESLint rule enforced in CI.
4. `account` is global. Cross-tenant identity becomes a config flag, not a migration.
5. Custom field defs are tenant-scoped, but the type catalog (which built-in types accept custom fields, allowed kinds) is git-side. Tenants extend, never invent.
6. Support tickets are above tenancy. A ticket can reference a tenant but isn't owned by one.
7. `tenant_id` is a string slug, not a FK reference to the global `tenant` row — keeps per-tenant backup/restore simple.

---

## 5. Config system — git + DB hybrid

Resolution order, deepest layer wins per key:

```
                effective tenant config
                          ▲
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   tenant_config       tenant_feature_      tenant_custom_
   (DB overrides)      flag (DB overrides)  field_def (DB)
        ▲                 ▲                 ▲
        └─────────────────┼─────────────────┘
                          │
                       plan defaults
                       (per-plan git file)
                          ▲
                          │
                    platform defaults
                    (single git file)
                          ▲
                          │
                    config schema (zod)
```

### Repo layout

```
platform/config/
  schema.ts          ← zod schema; source of truth for valid keys + paywall tier
  defaults.yaml      ← platform defaults (applies to every tenant)
  plans/
    free.yaml        ← free-tier defaults (in OSS)
    paid.yaml        ← paid-tier defaults (in CLOSED repo)
  tenants/
    .gitkeep         ← v1 has no per-tenant git files
```

### Schema shape

```ts
const ConfigSchema = z.object({
  branding: z.object({
    name, tagline, logoUrl, palette, preset, fontHeading, fontBody,
  }),
  labels: z.object({
    memberSingular, memberPlural, branchSingular, branchPlural,
    handbookNoun, currencyCode,
  }),
  features: z.object({  // = the 10 feature flags
    forums, handbook, loot, inventory, treasury, fleet, tournaments,
    "calendar.googleIntegration", "discord.bot", ads,
  }),
  integrations: z.object({
    discord: { guildId, botToken /* PAYWALL */ },
    googleCalendar: { calendarId },
    uex: { enabled /* future */ },
  }),
  customFields: z.record(
    z.enum([eligible types]),
    z.array({ key, label, kind, enumValues?, required }).max(3)
  ),
  domains: z.object({
    customDomain /* PAYWALL */, customDomainStatus,
  }),
  ads: z.object({ slots, fallbackHouseAd }),
});
```

### Runtime resolution

```ts
export async function getTenantConfig(tenantId: string) {
  return await unstable_cache(
    async () => {
      const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      const merged = deepMerge(
        platformDefaults,          // config/defaults.yaml
        planFile(tenant.plan),      // config/plans/{free,paid}.yaml
        (await db.tenantConfig.findUnique({ where: { tenantId } }))?.json ?? {}
      );
      const result = ConfigSchema.safeParse(merged);
      if (!result.success) {
        log.error("config-invalid", { tenantId, errors: result.error.issues });
        return ConfigSchema.parse(deepMerge(platformDefaults, planFile(tenant.plan)));
      }
      return result.data;
    },
    [`tenant-config:${tenantId}`],
    { revalidate: 60 }
  )();
}
```

Cache invalidation: admin UI writes call `revalidateTag(\`tenant-config:${tenantId}\`)` after every successful update.

### Admin UI

Lives at `<slug>.or9.space/admin/config`. Form fields auto-generated from zod schema. Paywall-gated keys render disabled with "Upgrade to edit" tooltip on free tier. Submit → `requireTier("COMMAND")` → schema validate → write → `revalidateTag` → audit log entry.

A you-only multi-tenant admin lives at `admin.or9.space/tenants/<slug>/config` — same form, bypasses paywall checks for emergency edits.

### Custom field def lifecycle

1. Tenant admin adds `forum_thread.bounty: number` via config UI.
2. Validation: key matches `^[a-z][a-z0-9_]{0,30}$`, label ≤ 60 chars, kind allowed, ≤3 per type.
3. Saved to `tenant_config.json.customFields.forum_thread`.
4. Thread create form renders the extra field.
5. On submit, value lands in `custom_field_value` row.
6. Thread view reads via joined query into a "More details" pane.
7. Deleting a def hides values from UI but does not delete the rows — re-adding the same key restores them.

---

## 6. Feature flag + content type contract

### The 10 feature flags

| Flag key | Routes | Content types owned | Default (free) | Default (paid) | Tenant editable? |
|---|---|---|---|---|---|
| `forums` | `/forums/*` | `forum_thread`, `forum_post` | ON | ON | yes |
| `handbook` | `/handbook/*` | `handbook`, `handbook_section`, `signoff_*`, `handbook_ack` | ON | ON | yes |
| `loot` | `/loot/*` | `loot_member`, `loot_session`, `loot_attendance`, `loot_transaction` | ON | ON | yes |
| `inventory` | `/inventory/*` | `org_item_*`, `personal_org_item_entry`, `org_item_request` | ON | ON | yes |
| `treasury` | `/treasury/*` | `treasury_entry`, `treasury_category` | ON | ON | yes |
| `fleet` | `/fleet/*` | `ship`, `hangar_slot` | OFF | ON | yes |
| `tournaments` | `/tournaments/*` | `tournament`, `tournament_bracket`, `tournament_registration` | OFF | ON | yes |
| `calendar.googleIntegration` | `/calendar` | (none — read-through) | ON | ON | yes |
| `discord.bot` | `/admin/discord/*` | (none — runtime) | OFF | ON | yes, paid only (paywall on enable) |
| `ads` | wraps all routes | `ad_slot`, `ad_creative` (global) | ON (forced) | OFF (forced) | NO — platform-controlled |

### The 25 content types

(Across the 7 flag-owning categories. Sub-tables count; e.g., `forum_post` is its own type. Tenants do not define new types.)

```
forum_thread, forum_post,
handbook, handbook_section, signoff_category, signoff_item,
signoff_signature, handbook_ack,
loot_member, loot_session, loot_attendance, loot_transaction,
org_item_catalog, org_item_instance, org_item_event, org_item_loan,
personal_org_item_entry, org_item_request,
treasury_entry, treasury_category,
ship, hangar_slot,
tournament, tournament_bracket, tournament_registration
```

### Custom-field-eligible types (9 of 25)

`forum_thread`, `handbook_section`, `signoff_item`, `loot_session`, `org_item_catalog`, `personal_org_item_entry`, `treasury_entry`, `ship`, `tournament`. Max 3 fields each → 27 def cap per tenant.

### Custom field kinds (v1 ships 4; `ref` + `url` deferred to Phase 1.5)

| Kind | Storage | UI control | Server validation |
|---|---|---|---|
| `text` | `value_text VARCHAR(500)` | `<input type="text">` | trim, max 500 |
| `number` | `value_num NUMERIC(20,4)` | `<input type="number">` | finite, within ±1e15 |
| `enum` | `value_text` constrained | `<select>` | value in def's `enumValues` |
| `datetime` | `value_text` ISO 8601 | `<input type="datetime-local">` | parseable + ≥ 2000-01-01 |

### Flag enforcement

```ts
// app/<feature>/layout.tsx
export default async function ForumsLayout({ children }) {
  const cfg = await getTenantConfig(getTenant());
  if (!cfg.features.forums) notFound();
  return <>{children}</>;
}
```

Server actions also call `requireFeature("forums")` defensively. Defense in depth — hidden routes still rejected via direct POST.

### Tenant relabeling

Every user-visible noun reads from `config.labels.*`. A `<L>` component does server-side label substitution — no client runtime cost. Tenant config can rename "Member" → "Pilot", "aUEC" → "credits", "Branch" → "Squadron", etc.

---

## 7. Tenant lifecycle

States:

```
   PENDING ──admin approves──▶ PROVISIONING ──▶ LIVE ◄──┐
       │                                          │     │
       │ admin rejects                            │     │ reactivate
       ▼                                          ▼     │
   REJECTED                              SUSPENDED ─────┘
                                              │
                                              │ 90d grace
                                              ▼
                                          ARCHIVED (data dropped, slug
                                                    released after 1y)
```

### Sign-up

`or9.space/start-org` form: org name, desired slug, email, ~250 char description, Turnstile captcha. Writes `pending_tenant`. Resend emails you a one-click approve/reject link.

### Approval queue (`admin.or9.space/tenants/pending`)

Queue rows show slug, name, email, description, captcha pass/fail, similarity score vs existing tenants (brand-impersonation guard). Approve / Reject buttons.

### Provisioning job

Background, idempotent, transactional. Creates `tenant` row, seeds default config + rank ladder + forum categories, generates a signed one-time founder-claim link, emails it, flips status to `LIVE`.

### Founder claim

`<slug>.or9.space/claim?token=…` — validates JWT (signed, 7d expiry, one-time), founder picks username + auth method (Discord OAuth preferred), creates `account` + `membership` (rank = top COMMAND tier), signs in, lands on welcome wizard.

### Welcome wizard (skip-able)

Upload logo → pick theme preset → toggle features → invite first members.

### Custom domain attach (paid only)

Form on `<slug>.or9.space/admin/domain`. Server action calls CF SSL-for-SaaS API. Status panel: pending → verifying → active OR failing. Background job polls CF every 15min. Detach removes binding + reverts to subdomain.

### Plan change

- Paid → free: tenant downgrades, custom domain auto-detaches, Discord bot disables, ads re-enable.
- Free → paid: Stripe Checkout in Phase 7. v1 has manual override from you-only admin UI.

### Closure + export

Tenant admin closes via `admin/danger-zone/close-org` (type org name to confirm). Background job: full JSON export + media zip to CF R2, link emailed (30d retention), status → SUSPENDED. 90d later → ARCHIVED + rows dropped. Slug released after 1 year.

### Reactivation

SUSPENDED tenant reactivates from `admin.or9.space/recover/<slug>` (auth required) within 90d. ARCHIVED is terminal.

### Failure modes

Pending neither approved nor rejected → cron escalates email after 7d, auto-rejects at 30d. Provisioning dies mid-flight → watcher cron retries with backoff, alerts you after 3 fails. Claim link expired → page offers fresh link. Custom-domain DNS never set up → status stuck at pending for 7d, then admin alert.

---

## 8. Cost + infra ceiling ($20/mo hard cap)

### Locked vendor stack

| Service | Plan | Use | Cost |
|---|---|---|---|
| VPS (Hetzner CX22) | $5–6/mo | Production Next + Discord bot + cron | $5–6 |
| Cloudflare | Free | Wildcard SSL, DDoS, edge cache, Tunnel | $0 |
| Supabase | Free | Postgres + auth + storage | $0 |
| Resend | Free (3k emails/mo) | Transactional email | $0 |
| CF R2 | Free 10 GB | Tenant media | $0 |
| GitHub | Free | Both repos | $0 |
| Domain | already owned | DNS + SSL | $0 |
| Vercel Hobby | Free | demo / staging only | $0 |
| Stripe | 2.9% + 30¢ per txn | Billing (Phase 7+) | $0 fixed |
| OAuth (Discord, Google) | Free | Auth providers | $0 |
| Turnstile | Free | Signup captcha | $0 |
| CF SSL-for-SaaS | $2/host/mo | Paid-tier custom domains | $0 until first paid customer |

**Total v1: $5–6/mo. Headroom under the $20 cap: $14/mo.**

### Why not Vercel Pro

Vercel Hobby ($0) explicitly forbids commercial use. Paid tier + ads = commercial. Vercel Pro is $20/mo per user — eats the entire budget on one line. Self-host on a $5–6 VPS instead. Same architecture, different host.

### Growth ceiling

| Free tier | Limit | Hit at |
|---|---|---|
| Supabase 500 MB DB | 500 MB | ~20–50 active tenants |
| CF R2 10 GB | 10 GB | ~hundreds of tenants |
| Resend 3k/mo | 3,000 | ~100 active tenants × 30 emails/mo |
| CX22 4 GB / 2 vCPU | — | thousands of req/sec |

When Supabase hits 500 MB: migrate to Neon free (3 GB) for free. Last resort: self-hosted Postgres on the VPS. Both keep cost at $5–6/mo well into hundreds of tenants.

### Rule

Every cost increase must be funded by revenue, not by you eating the diff. Paid tier (Phase 7) floor: $25/mo per paid tenant — covers Supabase Pro at 2 paid tenants OR funds VPS migration to a bigger node.

---

## 9. Testing strategy

Five layers, cost-ranked:

1. **Static** — ESLint custom rule `no-untenanted-query` rejects any Prisma call not via `db(tenantCtx).*`. Whitelisted globals: `account`, `tenant`, `pending_tenant`, `tenant_config`, `tenant_feature_flag`, `support_ticket`, `support_message`, `ad_slot`, `ad_creative`.

2. **Unit (Vitest, no DB)** — helpers, formatters, validators, permission helpers, FG business logic. Coverage gate: 80% lines, 90% branches on `lib/**`.

3. **Integration (Vitest + real Postgres)** — every action tested under a two-tenant fixture (`alpha` free + `bravo` paid). Eight mandatory categories per action: happy path, authz failure, tenant isolation, feature-flag respect, paywall, idempotency, zod validation, rate limit.

4. **E2E (Playwright against staging deploy)** — ~30 critical flows. Includes a self-host smoke that runs against the OSS-only build (no `platform-paid` deps) to prove self-host works standalone.

5. **Manual / live smoke** — pre-deploy checklist on prod via Playwright MCP, ~10 quick checks.

### Special test categories

- **Tenant-leak fuzzer** — nightly CI job pairing random tenants and scanning every API response for cross-tenant data bleed. Slow (~10 min) but irreversible-cost insurance.
- **RLS policy tester** — direct-Postgres test asserting only matching rows visible per `app.tenant_id`. Catches a forgotten policy after `CREATE TABLE`.
- **Config schema regression** — snapshot test of resolved `free.yaml` and `paid.yaml` configs. PR fails if paywall surface drifts unintentionally.
- **Migration safety** — every Prisma migration runs against a fresh DB AND a recent prod snapshot.

### TDD posture

Multi-tenant code (anything touching `tenant_id`): TDD mandatory. Write the tenant isolation test first, watch it fail, then make it pass. Non-negotiable.

UI code: TDD overkill — write component, bolt on integration tests for actions it calls.

### Explicitly not tested in v1

- Pixel-diff visual regression
- Performance benchmarks in CI
- Stripe webhook simulation (Phase 7+)
- Cross-browser matrix beyond Chromium
- Mobile-emulation

---

## 10. Open core split

Two repos. Premium overlays the OSS repo at build time.

```
github.com/or9space/platform        ← OSS, AGPL-3.0, public
github.com/or9space/platform-paid   ← Closed, private, your-account-only
```

### OSS repo (`platform`)

Ships a working multi-tenant app on its own. Clone, `pnpm i`, set env vars, point at any Postgres, deploy anywhere — get a fully functional single- or multi-tenant SC org platform. Premium-only features are simply absent (not stubbed, not gated).

Holds: route handlers, db.ts, config schema + free.yaml + defaults.yaml, feature flag registry, content type registry, permissions, lints, tests, OSS plans, self-host docs.

### Closed repo (`platform-paid`)

Thin overlay — ~10–20% of OSS size. Holds: ad serving, billing/Stripe, CF SSL-for-SaaS pipeline, paid-plan defaults (`config/plans/paid.yaml`), automated provisioning beyond manual, paid-tier tooltips, marketing analytics, support-triage SLA tracking.

### Build-time overlay mechanism

A 5-line `ExtensionRegistry` class in OSS (`platform/lib/extensions/registry.ts`) holds slots for `adProvider`, `billingProvider`, `domainAttachProvider`, etc. — each slot has a no-op default. `platform-paid/src/register.ts` registers real impls; the hosted deploy imports this file once at module-load time. Self-host deploys never import that file → no-ops kick in → everything works without paid features.

Two `if (ext.billingProvider !== noOp)` checks. No plugin DSL. No runtime introspection.

### License posture

AGPL-3.0 on `platform`. Proprietary on `platform-paid`. `platform-paid` consumes `platform` via well-defined interfaces — separate work, doesn't trigger AGPL copy-left into the closed code. Same posture Plausible, Mastodon-pro, Sentry use.

### Self-host story (must work cleanly)

```
1. git clone https://github.com/or9space/platform
2. pnpm i && cp .env.example .env  (fill in PG_URL, Resend, NextAuth, OAuth)
3. pnpm prisma migrate deploy
4. pnpm seed --first-tenant <slug>  (interactive)
5. pnpm build && pnpm start
```

Self-hosters get every feature flag forced ON (no plan tier), no ads, no billing, no automated CF SSL-for-SaaS. They configure DNS + certs manually for custom domains. The full multi-tenant codepath works.

### What hosted-or9.space sells over self-host

Convenience: managed provisioning, Stripe billing, CF SSL-for-SaaS pipeline, ads-off as a default for paying customers, hosted Discord bot, nightly backups, monitored uptime, support-ticket escalation.

### Risks

- AGPL fork re-implementing paid features in OSS — unlikely; nobody re-builds Stripe billing for fun.
- Plugin API drift — discipline: every paid feature lands in two commits (interface stub in OSS first, impl in closed second).
- Hosted-only patches — never ship security fixes hosted-only; backport everything to OSS.

---

## 11. v1 scope vs program scope

### v1 ships (FG-parity + 2 new features)

Every feature FG already has (members, ranks, ROE, forums, handbook, sign-offs, loot, inventory, treasury, recruit, Discord integration, Google Calendar integration), generalised to read tenant config. Plus:

- **Fleet management** — ship roster, hangar tracking.
- **Tournament registration** — single-elim brackets, member registration.

### Program scope (queued, no fixed order, customer-demand driven)

Each gets its own brainstorm cycle. None ship without a customer asking.

- In-game RSI/UEX integration (deep)
- Discord replacement chat/voice
- Analytics-as-a-service
- aUEC escrow / marketplace
- Native mobile app
- Email marketing / newsletter
- Built-in calendar replacement (only revisit if Google Calendar integration breaks)
- Voice notes / video upload
- AI features (auto-summarize etc)
- Full CSS theming (v1 ships preset themes + tenant accent OKLCH)

---

## 12. Phase boundaries

Each phase is a self-contained brainstorm → plan → build → ship cycle. No "almost finished" before the next starts.

| Phase | Goal | Estimated calendar |
|---|---|---|
| 0 | Multi-agent dev workflow + repo skeleton + Hetzner VPS + CF Tunnel + hello tenant | 1–2 days |
| 1 | Platform skeleton + tenant primitive + support portal + 2 hard-coded tenants | 2 wk |
| 2 | Config schema + admin editor + flag enforcement + custom field UI | 1.5 wk |
| 3 | FG feature port (9 sub-phases: forums, members, treasury, loot, handbook, inventory, fleet, tournaments, integrations) | 5 wk |
| 4 | `or9.space` marketing site + sign-up flow polish | 2 wk |
| 5 | Hub: tenant directory | 1 wk |
| 6 | FG production migration + DNS cutover | 1 wk + cutover |
| 7 | Stripe billing + ads + paid tier go-live | 2.5 wk |
| **Total** | | **~16 weeks (4 months optimistic, 6 with buffer)** |

### Phase dependency graph

```
0 → 1 → 2 → 3a..i → 4 (interleavable) → 5 → 6 → 7
```

Sub-phases of 3 are parallel-eligible per multi-agent capacity. Phase 4 can overlap with 3 (marketing copy doesn't need code-complete features).

### Multi-agent dev workflow (Phase 0 deliverable)

- **Opus** plans each sub-phase before any code (re-invoke brainstorming + writing-plans).
- **Sonnet** writes the implementation following the plan, in a worktree branch per sub-phase.
- **Opus** does final review before merge.
- Sub-phase exit: tests green + opus review approves + manual smoke passes → squash-merge to main → auto-deploy to staging → manual prod cut.

---

## 13. Open questions deferred

Not blocking v1 spec; revisit when phase reaches them.

- How does `demo.or9.space` reset cleanly nightly without destroying real data — likely a nightly `TRUNCATE WHERE tenant_id='demo'` + fixture replay. Spec'd in Phase 1 plan.
- Cross-tenant username collisions (Q13 B-future) — probably: `username` per-tenant + new global `account.handle`. Spec'd if/when Q6=C is brainstormed.
- Ad targeting beyond round-robin (geo, contextual). v1 ships round-robin only.
- Per-tenant git config repo (paid-tier "infrastructure-as-code") — defer to post-v1 Phase 8+.
- Re-evaluation of Q5 (custom domain free vs paid) once paid-tier value prop has 2+ stronger hooks.

---

## 14. Glossary

- **Tenant** — one org. Has a unique slug (e.g., `freedomguards`), gets `<slug>.or9.space` + optional custom domain.
- **Account** — global identity. v1 = 1 membership per account. Future: N memberships.
- **Membership** — `(account, tenant)` pair. Per-tenant username, rank, profile data.
- **Plan** — `free` or `paid`. Drives plan-tier defaults + paywall.
- **Feature flag** — boolean gate on a feature category. Default in plan file, override in `tenant_feature_flag`.
- **Custom field def** — tenant-defined extra field on an eligible content type. ≤3 per type.
- **Custom field value** — actual data for a custom field on a specific record.
- **Paywall key** — config key marked `.paywallTier("paid")` in zod schema. Free tier can't edit.
- **OSS repo** — `or9space/platform`, AGPL-3.0, fully functional standalone.
- **Closed repo** — `or9space/platform-paid`, proprietary, overlays OSS at build time for hosted deploy.
- **CF Tunnel** — Cloudflare's free secure tunnel between CF edge and origin VPS. No public IP exposure.

---

**Next step**: invoke `superpowers:writing-plans` skill to draft the **Phase 0 implementation plan** (multi-agent dev workflow + repo skeleton). Each subsequent phase gets its own brainstorm + plan cycle.
