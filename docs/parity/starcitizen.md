# Star Citizen Tools — Parity Audit

> Audit date: 2026-06-17
> Method: Visual/structural parity only. Data source differences (UEX live vs FG own cache) are not flagged.

---

## Page: Fleet Registry

**FG:** `src/app/fleet/page.tsx` + `components/fleet/fleet-viewer.tsx`
**Platform:** `app/fleet/page.tsx` + `components/fleet/fleet-viewer.tsx`

### FG Elements

- [MATCH] Page header (icon + title "Fleet" + subtitle)
- [MATCH] Ship count summary line ("N ships across N types")
- [MATCH] "My Hangar" shortcut button
- [MATCH] FleetStats composition bar (ships by role/size)
- [MATCH] Empty-state with Rocket icon and "Open My Hangar" CTA
- [MATCH] FleetViewer with search input
- [MATCH] FleetViewer sort dropdown (Name / Manufacturer / SCU)
- [MATCH] Grid / List view toggle
- [PARTIAL] Sort options — FG has "Most Owned" as default sort; platform only has Name/Manufacturer/Qty (no SCU sort)
- [MISSING] Per-ship owner avatar stack with linked member profiles — platform shows flat "ownerName" text per row, no avatar cluster or member links
- [MISSING] Ship role icon badges (RoleIcons component) on fleet cards/rows — platform omits role badges entirely
- [MISSING] Pad size badge (PadBadge) on fleet cards/rows — platform omits pad badges
- [MISSING] SCU badge (ScuBadge) on fleet cards/rows — platform shows quantity only, no SCU badge
- [DIFFERENT] KPI strip — platform adds MFD-styled "FLEET STATUS" panel (SHIPS / TOTAL QTY / MY SHIPS); FG uses a single count line; extra on platform
- [PARTIAL] My Hangar section — platform inlines "MY HANGAR" as an anchor-linked MFD panel on the same page with ship cards + AddShipForm; FG links out to `/fleet/hangar` as a separate page

---

## Page: Hangar

**FG:** `src/app/fleet/hangar/page.tsx` + `components/fleet/hangar-list.tsx`
**Platform:** `app/sc-tools/hangar/page.tsx`

### FG Elements

- [MATCH] Page header (icon + title "Hangar" / "My Hangar" + subtitle)
- [MATCH] Ship count summary line
- [MATCH] Ship search input
- [PARTIAL] Ship grid/list — platform renders a simple grid of linked tiles (name, manufacturer, SCU, crew) with no image preview; FG shows full image cards with gradient overlay, badges, loaner indicators, remove button
- [MISSING] Grid/List view toggle — platform is grid-only
- [MISSING] Sort dropdown (Recently Added / Name / Manufacturer / SCU / Quantity) — platform sorts server-side by manufacturer then name only
- [MISSING] Ship image with gradient overlay in cards
- [MISSING] Pad size badge (PadBadge) on hangar cards
- [MISSING] SCU badge (ScuBadge) on hangar cards
- [MISSING] Role icon badges on hangar cards
- [MISSING] Loaner ship indicator (ArrowRightLeft + loaner name chips)
- [MISSING] Remove ship button per card
- [MISSING] RSI Fleet Sync section (HangarSync component — browser extension JSON upload flow)
- [MISSING] "Add Ships Manually" section (ShipBrowser — paginated ship browser with hangar-slug dedup)
- [MISSING] FleetStats composition bar for personal hangar
- [DIFFERENT] Scope — platform Hangar is a public read-only ship catalog (no auth required); FG Hangar is an authenticated personal ship management page

---

## Page: Ship Prices (FG: /fleet/prices → Platform: /sc-tools/loadouts)

**FG:** `src/app/fleet/prices/page.tsx`
**Platform:** `app/sc-tools/loadouts/page.tsx`

### FG Elements

- [MATCH] Page header (icon + title "Ship Prices" + subtitle)
- [PARTIAL] Ship list/table — platform requires selecting a ship first (Hangar → Loadouts link flow); FG shows all ships in one paginated table
- [PARTIAL] Expandable buy/rent location details per ship — platform shows terminal table directly for selected ship; FG shows collapsed row with expand chevron
- [MATCH] Buy locations table (terminal code, location, aUEC price)
- [MATCH] Rent locations table (terminal, location, aUEC price)
- [MISSING] Search input across all ships — platform has no search; you pick a ship from Hangar
- [MISSING] Filter buttons (All / Buyable / Rentable) — platform shows all terminals for the selected ship
- [MISSING] Sort column headers (Ship name / Pledge USD / cheapest Buy / cheapest Rent) — platform has no sort on the terminal table
- [MISSING] Pledge (USD) price column — platform shows no real-money pledge price
- [MISSING] Warbond price sub-row — platform has no warbond data
- [MISSING] Ship count summary ("N ships")
- [DIFFERENT] Interaction model — FG is a unified sortable table of all ships; platform is a per-ship detail view driven by Hangar navigation

---

## Page: Compare (FG: /fleet/compare → Platform: /sc-tools/compare)

**FG:** `src/app/fleet/compare/page.tsx`
**Platform:** `app/sc-tools/compare/page.tsx`

### FG Elements

- [DIFFERENT] Subject — FG compares **ships** side-by-side (up to 3); platform compares **commodity buy/sell spread** for a single selected commodity
- [MISSING] Multi-ship selector (up to 3 ships with combobox search)
- [MISSING] Ship image header cards with gradient overlay
- [MISSING] Stat comparison table with color-coded best/worst highlighting (green/red)
- [MISSING] General stats: Cargo SCU, Crew, Mass, Length, Width, Height, Quantum Fuel, Hydrogen Fuel, Pad Size, Quantum Drive capable, Capabilities flags, Roles, Status (concept/flight ready)
- [MISSING] Pricing section: Pledge USD, In-Game aUEC, RSI Store link
- [MISSING] Default Loadout section (components by category: Weapons, Missiles, Shields, Quantum Drive, Power Plants, Coolers, Electronics, Defense)
- [MISSING] "Open in Loadout Editor" button per ship
- [MISSING] Swap Ship 1/2 button
- [MISSING] Copy shareable link button (URL params a/b/c)
- [PARTIAL] Commodity spread view on platform (cheapest buy card + best sell card + spread) — this is a different feature entirely, no equivalent in FG

---

## Page: Trade (FG: /fleet/trade → Platform: /sc-tools/trade)

**FG:** `src/app/fleet/trade/page.tsx` + `components/fleet/trade-tabs.tsx` + `route-planner.tsx` + `multi-hop-planner.tsx` + `commodity-rankings.tsx` + `trade-table.tsx`
**Platform:** `app/sc-tools/trade/page.tsx`

### FG Elements

- [MATCH] Page header (icon + title "Trade Board/Routes" + subtitle)
- [PARTIAL] Top Routes table — FG shows top 200 routes across all commodities ranked by margin; platform shows top 50 routes for a single selected commodity
- [MATCH] Route table columns: Buy terminal, Sell terminal, Profit/SCU
- [PARTIAL] Route table columns: ROI % — both present; FG also shows marginPct; platform shows ROI and Jump (distance)
- [MISSING] Tab: Route Planner (RoutePlanner component) — origin/destination terminal pickers, ship picker, cargo size input, filtered route results with infrastructure flags (refuel, docking, freight elevator, loading dock, monitored)
- [MISSING] Tab: Multi-Hop Planner (MultiHopPlanner) — chained multi-leg route optimizer
- [MISSING] Tab: Rankings (CommodityRankings) — sortable commodity rankings table with CAX score, avg buy/sell, best profit/SCU, profit %, availability, volatility
- [MISSING] Tab navigation bar (Route Planner / Multi-Hop / Top Routes / Rankings)
- [MISSING] Fleet Registry and My Hangar nav links in header
- [DIFFERENT] Commodity selector — platform requires picking a single commodity to see routes; FG shows cross-commodity top routes with no filter required

---

## Page: Commodity Prices (FG: industry + logistics commodity tables → Platform: /sc-tools/prices)

**FG:** `src/app/industry/page.tsx` (Mining Prices tab) + `src/app/logistics/page.tsx` (commodity context)
**Platform:** `app/sc-tools/prices/page.tsx`

### FG Elements from Industry/Logistics commodity view

- [MATCH] Page header (icon + title "Commodity Prices" + subtitle)
- [MATCH] Commodity selector dropdown
- [MATCH] Terminal price table (terminal, location, buy price, sell price)
- [PARTIAL] Live data attribution — FG shows "Live market data from UEX Corp" with refresh timestamp and refresh button; platform has no refresh button and no last-updated timestamp
- [MISSING] Refresh button with last-updated timestamp
- [DIFFERENT] Navigation — platform uses a URL-param commodity picker rendered inline as a form; FG industry page uses tabs (mining/fuel/refinery) with a separate commodity context

---

## Page: Star Map (FG: /locations → Platform: /sc-tools/starmap)

**FG:** `src/app/locations/page.tsx` + `components/locations/*` (7 files)
**Platform:** `app/sc-tools/starmap/page.tsx` + `components/locations/*` (same 7 files ported)

### FG Elements

- [MATCH] Page header (icon + title "Star Map" + subtitle)
- [MATCH] System tab buttons (live systems first, other systems after separator)
- [MATCH] Service filter pill buttons (toggleable, all services, icon + label)
- [MATCH] SystemMap SVG orbital view (sun, planets, moons, labels, zoom/pan)
- [PARTIAL] Station data on map — FG loads live station data from `/api/locations` (with services, orbitCodes, isLagrange); platform uses static system data with empty `stations: []` arrays — station tooltips and service highlights will not work on platform
- [MISSING] Dynamic station data (services, shops, orbit codes) — platform hardcodes only Stanton + Pyro planets/moons with no station detail
- [MISSING] API-driven system list — FG fetches `/api/locations` so data updates with UEX; platform is fully static
- [MISSING] initialSearch / deep-link via `?location=` URL param — platform doesn't pass `initialSearch` (starmap page ignores it)
- [DIFFERENT] Pyro system data depth — platform includes Pyro planets and gateways; FG only shows systems from the API which may or may not include Pyro depending on what UEX returns

---

## Page: Industry (FG: /industry → Platform: /sc-tools/industry)

**FG:** `src/app/industry/page.tsx`
**Platform:** `app/sc-tools/industry/page.tsx`

### FG Elements

- [MATCH] Page header (icon + title "Industry" + subtitle)
- [PARTIAL] Tab navigation — FG uses sidebar `?tab=` URL param switching between Mining / Fuel / Refinery; platform uses inline `?kind=` nav links for Minerals / Raw ores / Refined / Harvestable
- [MATCH] Mining/minerals commodity table with buy and sell prices
- [PARTIAL] Mining context card — FG shows a descriptive card explaining raw vs refined; platform omits the context card
- [MISSING] Fuel Prices tab (FuelTable) — quantum and hydrogen fuel prices per station with vs-avg comparison; platform has no fuel section
- [MISSING] Refinery Calculator tab (RefineryCalc) — per-method/location yield, cost, speed comparison; platform has no refinery section
- [MISSING] Refresh button with last-updated timestamp
- [DIFFERENT] Illegal commodity marker — platform shows inline "illegal" text label; FG uses AlertTriangle icon in rankings; both cover the concept but in different pages
- [PARTIAL] Illegal flag — platform shows it on commodity rows; FG shows it on the Rankings tab of Trade page

---

## Page: Logistics (FG: /logistics → Platform: /sc-tools/logistics)

**FG:** `src/app/logistics/page.tsx` + `components/logistics/manifest-card.tsx` + `components/logistics/create-manifest-button.tsx`
**Platform:** `app/sc-tools/logistics/page.tsx`

### FG Elements

- [DIFFERENT] Core concept — FG Logistics is a **cargo manifest tracker** (org-internal shipment management: open/claimed/in-transit/delivered/lost status cards with assignments); platform Logistics is a **terminal directory** (browse all UEX trade terminals by star system with search)
- [MISSING] Cargo manifest cards (ManifestCard component) — status, cargo details, claim/transit flow
- [MISSING] Status filter tabs (All / Open / Claimed / In Transit / Delivered)
- [MISSING] Create Manifest button (auth-gated)
- [MISSING] Manifest grid layout (2-3 col responsive)
- [MISSING] Per-manifest status badge, claim/transit actions, member assignment
- [PARTIAL] Search — FG filters manifests by status; platform has a terminal name/location search input (different subject matter)
- [PARTIAL] Grouping by system — platform groups terminals by star system in MFD panels; FG has no system grouping (manifests are not location-grouped)

---

## Summary

| Metric | Value |
|--------|-------|
| Pages audited | 9 |
| MATCH elements | ~25 |
| PARTIAL elements | ~22 |
| MISSING elements | ~45 |
| DIFFERENT elements | ~8 |
| **Total non-MATCH gaps** | **~75** |

### 3 Biggest Gaps

1. **Trade Board** — Platform is missing 3 of 4 tabs entirely: Route Planner (terminal picker + ship + cargo size → filtered routes with infrastructure flags), Multi-Hop Planner (chained legs), and Commodity Rankings (CAX score table). Only the basic Top Routes table exists, and even that is scoped to a single commodity instead of the all-commodity top-200 view.

2. **Ship Compare** — The platform's `/sc-tools/compare` is a commodity spread tool, not a ship comparator at all. The FG ship-compare is a feature-rich 3-ship side-by-side table covering 15+ stat categories (dimensions, fuel, capabilities, roles, pricing, default loadout by component category) with best/worst highlighting, URL-shareable state, and loadout editor links. Zero parity.

3. **Hangar (personal)** — Platform Hangar is a public read-only ship catalog with no auth, no personal ship management, no image cards, no sort/filter richness, no loaner indicators, no RSI Fleet Sync (browser extension JSON import), and no "Add Ships Manually" browser. FG Hangar is a full personal fleet management page. The platform's fleet management equivalent is inlined on the Fleet page as an anchor section, but it lacks grid/list richness, badges (SCU, pad, roles), loaners, and sync.
