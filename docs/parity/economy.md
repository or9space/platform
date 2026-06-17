# Economy Cluster Parity Audit

_Audited: 2026-06-16_

---

## Loot Hub (`/loot`)

- [MATCH] Page header — icon, title "Loot Points", subtitle
- [MATCH] Attendance/sessions navigation button (header action)
- [MATCH] Officer-gated "Run loot session/pile" button (header action)
- [PARTIAL] Standing band hero section — rank, total, balance shown on both; FG also shows delta-from-last-session and last-6-session strip; platform omits both delta and session strip
- [MISSING] Session strip (last 6 attendance cells with present/late/absent icons) — FG `SessionStrip` component not ported
- [MISSING] Delta-from-last-session indicator ("+ X pts from <session>") in standing band — not computed or shown on platform
- [PARTIAL] Transfer points action — FG has a `TransferDialog` modal accessible from the standing band; platform omits the transfer button from the hub entirely (transfer only available via member detail page)
- [MATCH] "No loot wallet" fallback section when viewer has no loot member
- [MATCH] "Near You" standings context widget
- [PARTIAL] Near You — FG shows `@username` when available and an "off-site" badge for unlinked members; platform shows `displayName` only, no off-site badge
- [MATCH] Latest session card (sidebar slot)
- [PARTIAL] Latest session card — FG shows present count + top-streaks list; platform shows session date, notes, participant count, and top balance instead (no streak computation)
- [MATCH] Collapsible full leaderboard
- [PARTIAL] Leaderboard — FG shows `@username` + off-site badge per row; platform shows `displayName` only, no off-site badge
- [DIFFERENT] Add-participant form — platform surfaces an inline `AddParticipantForm` on the hub page (officer only); FG routes this into the grid/RosterManager instead

---

## Loot Member Detail (`/loot/[memberId]`)

- [MATCH] Back-to-loot breadcrumb link
- [DIFFERENT] Hero section — FG renders a gradient hero band using the member's rank tier colour (ENLISTED/NCO/OFFICER/COMMAND), shows linked/unlinked status label, and displays the member's `@username`; platform renders a flat icon + heading with no tier colour or linked-status label
- [MATCH] Balance display (large readout)
- [PARTIAL] Officer action bar — FG has a tabbed "Record spend / Manual adjust" panel for OFFICER+; platform splits into separate `SpendForm` (OFFICER) and `AdjustForm` (COMMAND) components inside an MfdPanel — functionally equivalent but COMMAND-gating for adjust is more granular on platform
- [MATCH] Transfer form (peer-to-peer, non-self)
- [PARTIAL] Transaction ledger — both show date, type badge, amount, note; FG additionally shows the `createdBy` author and `relatedMember` name; platform omits the author column
- [MISSING] Attendance history tab/section — FG's `HistoryList` renders a side-by-side attendance log (session label, present/late/absent icon, points earned) alongside the ledger; platform has no attendance history section on the member detail page

---

## Loot Grid / Pile (`/loot/grid`, `/loot/pile`)

_Platform equivalent: `/loot/sessions`_

### Attendance Grid (`/loot/grid` → `/loot/sessions`)

- [MATCH] Create-session form (officer only)
- [MATCH] Sessions list table (date, label)
- [MISSING] Member filter / search box — FG has a `GridFilter` (text search by name) on the grid page; platform sessions page has no filter
- [MISSING] Full multi-session attendance matrix — FG's `AttendanceGridTable` is a wide scrollable cross-tab with one column per session and one row per member; platform shows attendance only for the single selected session in a single-session view
- [MISSING] Sticky member-name column with earned/used/total balance columns in the grid
- [MATCH] Per-session attendance status cells (PRESENT / LATE / ABSENT) with click-to-cycle for officers
- [PARTIAL] Session notes — platform sessions list shows notes column; FG grid does not surface per-session notes in the same way
- [MISSING] Roster manager — FG's `RosterManager` (collapsible, add new gamertag + link to site user) is part of the grid page; platform has no link-member-to-account UI on sessions page (add participant on hub only adds by displayName)
- [MISSING] Member-username link display in grid — FG renders `@username` when available; platform renders displayName only

### Loot Pile (`/loot/pile`) — **No direct platform equivalent**

- [MISSING] Dedicated loot-pile run page — FG has a full-screen `PileConsole` for running real-time loot distribution during an event; platform has no equivalent page
- [MISSING] MemberPicker component — filterable member selector showing present-session attendees highlighted
- [MISSING] Real-time spend console — bump-by-0.5 stepper UI, record button, recent-spends audit trail
- [MISSING] Present-count header — shows session label and how many members are present
- [MISSING] Session-scoped present/not-present member separation in spend UI

---

## Treasury (`/treasury`)

- [MATCH] Page header — icon, title, subtitle
- [MATCH] Balance summary (running total, income, expense)
- [MATCH] Category breakdown section (by-category net totals)
- [PARTIAL] Balance display — FG uses a plain `TreasurySummary` component card; platform uses an MfdPanel with explicit BALANCE / INCOME / EXPENSES labels with icons — richer readout
- [PARTIAL] Category breakdown display — FG renders a 4-column card grid; platform renders a compact inline flex list — less scannable but functionally equivalent
- [MATCH] Transaction history ledger table (date, type, category, amount, description, author)
- [DIFFERENT] Type/category filtering — platform adds a GET-param filter form (type + category dropdowns with clear button); FG has no filtering on the ledger
- [MATCH] Add entry action (NCO+ gated)
- [DIFFERENT] Add entry UX — FG uses an `AddEntryDialog` modal; platform uses an inline `AddEntryForm` always visible on the page
- [MATCH] Delete entry action (COMMAND gated)
- [MISSING] Operation linkage — FG's `TreasuryEntry` model includes an optional `operation` foreign key (displayed in the table); platform treasury entries have no operation linkage column

---

## Contracts (`/contracts`)

- [MATCH] Page header — icon, title, subtitle
- [MATCH] Contract list display
- [MISSING] Type filter tabs — FG has 10 contract-type tabs (CARGO, ESCORT, MINING, BOUNTY, SALVAGE, REPAIR, SCOUT, RACING, OTHER, ALL); platform has no type filter
- [MISSING] Status filter tabs — FG has 6 status filter tabs (OPEN, CLAIMED, IN_PROGRESS, COMPLETED, CANCELLED, ALL); platform has no status filter (only shows OPEN/CLAIMED with no IN_PROGRESS distinction)
- [DIFFERENT] Contract card layout — FG uses a `ContractCard` component with avatar for poster, color-coded type badge, color-coded status badge, reward highlighted in gold, expiry date, and claimedBy display; platform uses a plain list item with status badge and reward as MfdReadout — no poster avatar, no type badge, no expiry date
- [MISSING] Contract type badge — FG shows CARGO/ESCORT/MINING/etc. type on each card; platform has no type field
- [MISSING] Expiry date display — FG shows expiry date on cards; platform has no expiry concept visible in UI
- [MISSING] Poster avatar / identity on card — FG shows poster avatar + name; platform shows only "CLAIMED BY" attribution
- [DIFFERENT] Create contract permission — FG allows any logged-in member to create a contract; platform gates creation to OFFICER+
- [PARTIAL] Contract status lifecycle — FG supports OPEN→CLAIMED→IN_PROGRESS→COMPLETED/CANCELLED (5 states); platform supports OPEN/CLAIMED/COMPLETED/CANCELLED (4 states, no IN_PROGRESS)
- [MISSING] Empty state illustration — FG uses an `EmptyState` with description copy; platform shows a plain centered text

---

## Awards (`/awards`)

- [DIFFERENT] Data model — FG has award types (templates) with category (COMBAT/LEADERSHIP/COMMUNITY/HUMOR/LONGEVITY/SPECIAL) and manages individual `userAward` grant records; platform has flat award records with name, description, and a recipients list per award — no category taxonomy
- [MISSING] Award types / catalog section — FG renders an "Available Awards" grid of medal cards (icon, name, category badge, description, count granted); platform has no catalog view, awards are per-instance records only
- [MISSING] Category colour coding — FG maps categories to badge colours and ring colours; platform has no category concept
- [MISSING] Medal icon with ring — FG shows a 16×16 circular medal icon with category-coloured ring per award type; platform uses no per-category visual
- [MATCH] Recipients display per award
- [PARTIAL] Recipient entry — FG shows avatar, display name, citation quote, date, and nominated-by attribution; platform shows name, note, and a revoke button for officers — no avatar, no citation quote, no nominated-by
- [MISSING] Nominate button (peer nomination flow) — FG has a `NominateButton` open to any logged-in member to nominate peers across award types; platform has no peer nomination, only officer-direct grant
- [MISSING] "Recent recipients" chronological section — FG renders a dedicated recent-awards feed sorted by date across all award types; platform only shows recipients grouped within each award record
- [PARTIAL] Award creation — FG uses admin-seeded `awardType` records (no in-page creation); platform has an `AwardCreateForm` for officers to create new award definitions inline
- [MATCH] Grant award action (officer only)
- [MATCH] Revoke/delete award action (officer only)

---

## Alliances (`/alliances`)

- [MATCH] Page header — icon, title, subtitle
- [DIFFERENT] Relationship taxonomy — FG uses 5 statuses grouped as sections: ALLIED / FRIENDLY / NEUTRAL / UNFRIENDLY / HOSTILE; platform uses 4 statuses flat: ALLY / NEUTRAL / HOSTILE / PENDING — "FRIENDLY" and "UNFRIENDLY" are missing; "PENDING" is new
- [MISSING] Grouped-by-relationship sections — FG groups alliances under labelled section headers (ALLIED, FRIENDLY, etc.); platform renders a flat list with status badges only
- [DIFFERENT] Alliance card layout — FG uses an `AllianceCard` with org logo image (falls back to initials), relationship Badge component with colour coding, notes text, and RSI org page external link; platform uses plain list items with status badge, name (with optional href link), and description — no logo, no RSI link
- [MISSING] Org logo / avatar — FG shows org logo URL (Image component, falls back to initials); platform has no logo field
- [MISSING] RSI org page link — FG stores `orgSlug` and renders a link to `robertsspaceindustries.com/orgs/<slug>`; platform has no RSI integration field
- [DIFFERENT] Create permission — FG gates alliance creation to COMMAND tier only; platform gates to OFFICER+
- [PARTIAL] Alliance create form — FG's `AllianceDialog` is a modal; platform uses an inline `AllianceCreateForm` in an MfdPanel; field sets differ (FG has orgName, orgSlug, orgLogoUrl, relationship, notes; platform likely has name, status, description, link)
- [MATCH] Delete alliance action (officer/command gated)
