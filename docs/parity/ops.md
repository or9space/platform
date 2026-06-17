# OPS/WORK Parity Audit — Freedom Guards (FG) vs or9.space platform

Read-only audit. FG = `C:\Projects\FreedomGuard\src`, platform = `C:\Projects\platform`.
Status legend: MATCH / PARTIAL / MISSING / DIFFERENT.

## Operations index (FG operations/page.tsx → platform operations/page.tsx)

- [MATCH] PageHeader (title=Operations, subtitle=Mission planning and crew signups)
- [PARTIAL] Create operation — FG inline `CreateOperationForm`; platform links to `/operations/new` page — note: different UX (separate page vs inline form)
- [DIFFERENT] Operations listing — FG uses drag-drop `OpsKanbanBoard`; platform uses static status lanes — note: no drag-drop reordering on platform
- [MISSING] Archive link button (→ /operations/archive) — note: platform has no archive route at all
- [DIFFERENT] Stat bar — platform adds total + per-status count panel; FG has none — note: platform extra, not a gap
- [MATCH] Op cards show title, scheduled date, location, signup count

## Operation detail (FG operations/[operationId] → platform operations/[id])

- [MATCH] Back link to /operations
- [MATCH] Status badge (PLANNING/BRIEFING/ACTIVE/DEBRIEFING/COMPLETED)
- [MATCH] Operation title
- [PARTIAL] Admin status control — FG `OperationStatusControls`; platform `StatusControl` — note: present but simpler
- [MISSING] Edit operation button (manager) — note: no edit affordance on platform
- [MISSING] Delete operation button (manager) — note: no delete affordance on platform
- [MATCH] Description text
- [DIFFERENT] Scheduled date/time — FG is user-timezone-aware; platform is not — note: no per-user timezone formatting
- [MATCH] Location readout
- [MATCH] Created-by readout
- [MISSING] Numbered objectives list — note: platform omits objectives entirely
- [MISSING] After-Action Report (AAR editor / textarea on DEBRIEFING/COMPLETED) — note: no AAR feature
- [MISSING] SlotEditor / RosterDisplay (role slots) — note: platform has no slot-based roster
- [PARTIAL] Signups — FG multi-role-preference `SignupButton` (maxSignupPreferences); platform single-role join/leave `SignupControl` — note: no multi-preference signups
- [MATCH] Crew/signup list with names + role badges
- [MISSING] Squad color coding on signup list — note: no squad colors
- [MISSING] Discussion / comments thread + add-comment form — note: no comments on platform
- [MISSING] ShipSuggestions sidebar (AI ship recommendations) — note: feature absent

## Operations archive (FG operations/archive → platform: route MISSING)

- [MISSING] Entire archive route — note: `platform/app/operations/archive/page.tsx` does NOT exist
- [MISSING] Archived-op count badge
- [MISSING] Grid of archived op cards (title, description, completedAt, location, signup count)
- [MISSING] Empty state with 30-day auto-archive explanation

## Projects index (FG projects/page.tsx → platform projects/page.tsx)

- [PARTIAL] PageHeader — FG subtitle "Team boards and tickets"; platform uses readout=count, no matching subtitle — note: subtitle text differs
- [PARTIAL] Create — FG `CreateTeamForm` (creates teams); platform `ProjectCreateForm` (creates projects directly) — note: no team abstraction on platform
- [DIFFERENT] List cards — FG team cards show member count, board count, myRole badge; platform project cards show done/total ticket count — note: no member count / board count / role badge
- [MATCH] Cards link to detail page
- [MATCH] Empty state

## Project board/ticket detail (FG projects/[teamSlug]/[boardSlug] → platform projects/[id])

- [DIFFERENT] Layout — FG full-height 100vh `BoardHeader` + `KanbanBoard`; platform normal-flow space-y-6 — note: no full-height board layout
- [PARTIAL] Board columns — FG dynamic board columns; platform fixed TODO/IN_PROGRESS/DONE MfdPanels — note: hardcoded columns, no drag-drop implied
- [MATCH] Ticket create form (officer+)
- [DIFFERENT] Ticket cards — platform `TicketCard` shows title, description, status, assignee; FG via `KanbanBoard` — note: comparable content, simpler interaction
- [DIFFERENT] Delete project button (officer+) — platform has it; FG team/board model differs — note: structural difference
- [MISSING] Team-slug / board-slug routing (FG nests team → board) — note: platform flattens to single /projects/[id]

## Squads (FG admin/squads/page.tsx → platform squads/page.tsx)

- [DIFFERENT] Route — FG admin-only `/admin/squads`; platform public-ish `/squads` (officer-gated actions) — note: location/gating differs
- [DIFFERENT] Layout — FG table (Color | Name | Members | Actions); platform card/list with member chips — note: table vs cards
- [MISSING] Color swatch per squad — note: platform squads have no color
- [MATCH] Create squad (FG `CreateSquadButton` / platform `SquadCreateForm`)
- [MISSING] Edit squad button — note: no edit on platform (only create/delete)
- [MATCH] Delete squad (officer+)
- [MATCH] Squad membership management (FG `SquadMembers` / platform AddMemberForm + RemoveMemberButton)
- [DIFFERENT] Squad description field — platform shows description; FG does not — note: platform extra, not a gap

## Handbook index (FG handbook/page.tsx → platform handbook/page.tsx)

- [PARTIAL] PageHeader — FG subtitle "Branch field handbooks and sign-off records"; platform "FIELD REFERENCE DOCUMENTS" — note: subtitle differs
- [PARTIAL] Create handbook — FG implied via admin; platform `CreateHandbookForm` (COMMAND+) — note: present, gating comparable
- [DIFFERENT] Listing — FG card grid; platform list — note: grid vs list
- [MISSING] Branch badge per entry — note: no branch taxonomy shown
- [MISSING] Per-user ack status badge (Acknowledged / Updated / Unread) — note: no ack state on index
- [MISSING] PDF indicator per card — note: no PDF concept
- [MATCH] Version display per entry
- [MATCH] Draft/published gating (platform shows DRAFT to COMMAND)

## Handbook detail (FG handbook/[slug] → platform handbook/[slug])

- [MATCH] Back link
- [PARTIAL] PageHeader with title/subtitle/version — platform present; FG adds branch badge — note: no branch badge
- [MISSING] HandbookToc sidebar (two-column TOC layout) — note: single-column on platform
- [MISSING] Cover card (logo, FIELD HANDBOOK label, chapter/sign-off counts) — note: absent
- [MISSING] Download PDF button — note: no PDF
- [MISSING] Print view link — note: absent
- [MISSING] "My sign-off sheet" link — note: absent
- [MISSING] "Sign off member" link (officer+) — note: absent
- [MISSING] Admin link (officer+) — note: only an Edit button on platform
- [MISSING] Creed section (blockquote) — note: absent
- [MISSING] Twelve Marks grid — note: absent
- [MATCH] Acknowledge card/button (published only)
- [MISSING] Re-acknowledge / version-change tracking prompt — note: simple acknowledge only
- [DIFFERENT] Chapters/sections — FG `MarkdownContent` with chapter number/kicker/title + field-note sidebar; platform plain whitespace-pre-wrap text — note: no markdown rendering, no chapter chrome
- [MISSING] Sign-Off Record section (categories, officerQualifying/awardsCert badges, signersRequired, ordered items) — note: entire feature absent
- [MISSING] Ranks section (Command Ranks + Qualification Ladder) — note: absent

## Inventory index (FG inventory/page.tsx → platform inventory/page.tsx)

- [PARTIAL] PageHeader (title=Inventory, org-wide gear subtitle) — note: matches text, but page purpose differs (dashboard vs item table)
- [MISSING] Rank/tier gate (no-rank → empty state) — note: no tier gating on platform
- [MISSING] Summary dashboard cards (Assigned to me / Open requests / My personal stash) — note: absent
- [MISSING] Recent activity feed (verb, item, actor, time, note) — note: absent
- [DIFFERENT] Main content — platform shows searchable items table + CreateItemForm; FG shows dashboard + links — note: platform is a flat item registry
- [MISSING] "Browse catalog" link / catalog concept — note: platform models items+holdings, no catalog
- [MISSING] "Receive items" link (NCO+) — note: absent
- [MISSING] Viewer-tier disclosure footnote — note: absent

## Inventory sub-routes (FG → platform)

- [MISSING] inventory/catalog (catalog browse: search, category filter, item grid, pagination) — note: no catalog route
- [MISSING] inventory/me (personal stash + org items held, PersonalEntryForm) — note: no personal-inventory route
- [MISSING] inventory/stash (org stash grid, filters, custodian-by-tier visibility) — note: no stash route
- [MISSING] inventory/pile (legacy redirect → stash) — note: n/a (stash absent)
- [MISSING] inventory/requests (request quartermaster: RequestForm, status tabs, officer "pick instance") — note: no requests route/feature
- [DIFFERENT] inventory/[itemId] — platform item detail (description, qty/holdings stat strip, CreateHoldingForm, holdings table, delete for COMMAND); FG has catalog item detail instead — note: holdings model vs catalog/instance model; no requests, no assignment, no personal-stash linkage

## Inventory detail extras (platform-only / model differences)

- [DIFFERENT] Holdings model — platform uses items → holdings (qty/state/custodian/notes); FG uses catalog → instances + assignments + requests + personal stash — note: fundamentally different inventory domain model; FG is far richer
