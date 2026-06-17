# Freedom Guards → or9.space — Full Parity Checklist

Generated 2026-06-17 from 6 cluster audits. Status per element: MATCH / PARTIAL / MISSING / DIFFERENT.

## Gap tally by cluster
- Core (dashboard/activity/roster/profile/messages/settings/recruit): ~63
- Economy (loot/treasury/contracts/awards/alliances): ~44
- Star Citizen (fleet/hangar/prices/compare/trade/starmap/industry/logistics): ~75
- Content (forums/news/calendar/lfg/resources/gallery): ~38
- Ops/Work (operations/projects/squads/handbook/inventory): ~60
- Chrome+Admin (shell/auth/admin/notifications): ~38
- **TOTAL ≈ 318**


---

# Chrome + Admin Parity Audit — FreedomGuard vs or9.space Platform

**Date:** 2026-06-17
**FG source:** `src/components/layout/navbar.tsx`, `sidebar.tsx`, `app-shell.tsx`, `notifications-bell.tsx`
**Platform source:** `components/tenant-shell.tsx`, `components/tenant-shell-chrome.tsx`

---

## 1. Shell Chrome

### 1a. Navbar (overall)

- [MATCH] Fixed top bar, h-16, `border-b-2 border-primary/40 bg-surface/95 backdrop-blur-sm` — identical Tailwind spec
- [MATCH] Mobile hamburger button (`Menu` icon, lg:hidden)
- [MATCH] Left cluster: logo + wordmark inside `<Link href="/">`
- [MATCH] Right cluster: search icon, notifications bell, user menu — same order

### 1b. Logo / Wordmark

- [DIFFERENT] FG: `<Image src="/images/branding/logo.png">` (static PNG, always shown) + two-span wordmark `fg-wordmark__free` / `fg-wordmark__guards` with hardcoded strings "FREEDOM" / "GUARDS". Platform: `<img src={logoUrl}>` when `logoUrl` set, fallback is a letter-initial placeholder `<span>` with `bg-primary/15`; wordmark text is split dynamically from `brandName` (first word / rest). FG uses Next.js `<Image>`, platform uses plain `<img>`.

### 1c. Navbar Right Cluster — Search

- [DIFFERENT] FG: `<GlobalSearch />` — opens a full search dialog/modal component (`src/components/search/global-search`). Platform: plain `<a href="/members">` with `<Search>` icon, aria-label "Search members"; no search dialog, just a link to the members list.

### 1d. Navbar Right Cluster — Notifications

- [DIFFERENT] FG: `<NotificationsBell />` — full rich dropdown with real `notifications` API (`/api/notifications`), typed notification items, read/unread state, mark-all-read action, "View all" link to `/notifications`, polls every 30 s. Platform: `<a href="/messages">` with `<Bell>` icon + unread DM badge (integer count from SSR); only shown when `messagesEnabled` is true; no dropdown, no notification entity — just a redirect to the messages page. No `/notifications` route or system notifications exist in the platform.

### 1e. Navbar Right Cluster — User Menu

- [MATCH] Same avatar (initial letter, `bg-tier-command-soft`), name label hidden below md, dropdown on click
- [MATCH] Menu items: View Profile (Eye icon), Settings (User icon), Sign Out (LogOut icon, `signOut({ callbackUrl: "/" })`)
- [DIFFERENT] FG: View Profile links to `/members/${session.user.username}`, Settings links to `/settings/profile`. Platform: View Profile links to `profileHref` (server-resolved, may be `/members/{username}` or `/members`), Settings links to `/settings` (no `/profile` sub-path).
- [DIFFERENT] FG: click-outside uses `pointerdown` with `ref + contains` + Escape key binding, full a11y (`aria-label`, `aria-expanded`, `aria-haspopup`). Platform: simpler — state toggle only, no click-outside close, no Escape key handler, no `aria-label` on the trigger button.

### 1f. Navbar — Unauthenticated State

- [MISSING] FG shows "Sign In" + "Enlist" (→ `/recruit`) links when no session. Platform: no unauthenticated navbar state — TenantShell is always member-only (non-members are never shown the shell).

### 1g. Sidebar — Sections + Section Headers

- [MATCH] Two named sections: "Org" and "Star Citizen" — same titles, same `[` `]` bracket styling, item count readout on right
- [DIFFERENT] FG: section headers are `<button>` elements that toggle section collapse with chevron icon + localStorage persistence. Platform: section headers are static `<div>` elements — NO collapse/expand on section headers; sections are always expanded.
- [MATCH] Admin section separator: both show admin items in a distinct group below regular nav
- [DIFFERENT] FG: "Administration" section header label shown when expanded. Platform: no separate "Administration" label — admin items are not present in `TenantShellChrome` at all (admin nav is a separate admin layout, not in the sidebar).

### 1h. Sidebar — Item Icons

- [MATCH] Same icon set from lucide-react for all core items
- [DIFFERENT] FG: icons resolved via direct imports bound to each nav item inline. Platform: resolved via `ICONS` lookup record keyed by string name — same visual result but different icon mapping for a few items: e.g. `squads` maps to `Users` (same as members), `industry` uses `mining` key (Pickaxe).
- [MATCH] Active state: `bg-primary/15 text-primary font-medium mfd-nav-active`
- [DIFFERENT] FG: active state also has `shadow-[inset_0_0_12px_oklch(55%_0.18_25/0.15)]` glow. Platform: no inset shadow on active items.

### 1i. Sidebar — Active State Detection

- [DIFFERENT] FG: uses Next.js `<Link>` with `aria-current`, handles query-string items separately (e.g. `/industry?tab=mining`). Platform: uses plain `<a href>` tags; `isActive` helper splits on `?` but the actual SC-tools routes no longer use query-string tabs (they are under `/sc-tools/*` paths), so the query-string matching path is effectively dead.

### 1j. Sidebar — Unread Badge on Messages

- [MATCH] Both show an unread count badge on the Messages item
- [DIFFERENT] FG: fetches `/api/messages/unread` client-side on mount + 30 s poll. Platform: unread count is server-rendered (SSR, passed as `unread` prop) — more efficient but does not auto-refresh.

### 1k. Sidebar — Feature Visibility / Admin "See All" mode

- [DIFFERENT] FG: has an `adminSeesAll` flag — when true, admin users see ALL nav items including disabled ones (shown in red/strikethrough). Platform: items are filtered server-side in `TenantShell`; disabled items are simply not included in the sections array — no admin override-visibility mode.

### 1l. Sidebar — Collapse

- [MATCH] Collapse to w-16 icon-only mode; PanelLeftClose / PanelLeftOpen toggle button; collapsed divider between sections
- [DIFFERENT] FG: collapse state persisted to localStorage (`fg-sidebar-collapsed` — implicit via `collapsed` prop from AppShell parent). Platform: collapse state is `useState` local to `TenantShellChrome` — not persisted to localStorage.

### 1m. Sidebar — Mobile Behaviour

- [DIFFERENT] FG: mobile open state controlled by Navbar's hamburger, passed down as `sidebarOpen` prop to Sidebar; mobile overlay in AppShell. Platform: mobile open state is internal to `TenantShellChrome` alongside the sidebar; overlay scrim also internal — consolidated approach; functionally equivalent.

### 1n. Sidebar — Settings Item

- [MATCH] Always-visible Settings link at bottom of nav scroll area
- [DIFFERENT] FG: Settings is a standalone item rendered after admin section, outside any `<ul>`, links to `/settings/profile`. Platform: Settings is added as part of an "Account" `NavSection` — same visual position, links to `/settings`.

### 1o. Sidebar — Footer

- [DIFFERENT] FG: footer has two rows: (1) Discord online status indicator (live pulsing dot + `${discordOnline} Online` count, links to `/discord`, driven by `useDiscordStatus` hook); (2) version string "Freedom Guards v1.0" + collapse toggle. Platform: footer has ONE row only: tenant `brandName` text + collapse toggle. NO Discord status, NO version string.

### 1p. AppShell — WidgetBot

- [MISSING] FG `app-shell.tsx` renders `<WidgetBotCrate />` (Discord WidgetBot embedded chat widget) for authenticated sessions. Platform: no WidgetBot or embedded Discord chat in the shell.

### 1q. AppShell — Print Route

- [MISSING] FG AppShell skips navbar/sidebar for routes ending in `/print`. Platform: no print-route bypass in TenantShellChrome.

---

## 2. Auth Pages

### 2a. Login Page

- [DIFFERENT] FG (`src/app/(auth)/login/page.tsx`): full MFD-themed login with: FG logo PNG, "AUTH TERMINAL" stencil header, `mfd-frame` chassis wrapper, Discord OAuth button (`signIn("discord")`), email/password credential form, structured error messages keyed by OAuth error code, callback URL sanitization, redirect-on-session. Platform: thin wrapper calling `<AuthForm mode="login">` — minimal styling (plain `mfd-cut-tl-br` border, no MFD frame, no logo PNG), no Discord OAuth option, simpler generic error "Invalid email or password", no callback URL logic.
- [MISSING] FG login has Discord OAuth ("Sign in with Discord") button as primary CTA. Platform has no OAuth provider at all.
- [MISSING] FG login footer links: "CREATE ACCOUNT" + "APPLY TO JOIN" (`/recruit`). Platform: only "Need an account?" link to `/register`; no `/recruit` concept.
- [DIFFERENT] FG: full tactical-grid background, logo drop shadow, amber readout decorators. Platform: minimal chrome — `bg-tactical-grid` class present but no logo, no decorative MFD frame labels.

### 2b. Register Page

- [MATCH] Both have: username field, email field, password field, error display, submit button
- [DIFFERENT] FG: also has `displayName` + `confirmPassword` fields. Platform: no `displayName`, no confirm-password.
- [DIFFERENT] FG: full MFD-frame + logo + "REGISTRATION TERMINAL" stencil header. Platform: same plain `AuthForm` component as login, no separate register page styling.
- [DIFFERENT] FG: uses `registerUser` server action directly. Platform: calls `registerAction` prop injected by the parent page.
- [MISSING] FG register footer links "APPLY TO JOIN" (`/recruit`). Platform has no `/recruit`.

### 2c. Set-Password Page

- [MISSING] FG has no set-password page at all. Platform has `(auth)/set-password/page.tsx` — token-gated flow using `peekSetupToken`, renders `<SetPasswordForm>`. This is a platform-only flow for invite-based account setup.

---

## 3. Admin Pages

### 3a. Admin Home / Dashboard

- [DIFFERENT] FG (`/admin/page.tsx`): rich dashboard with 4 stat-row grids (16 KPIs covering membership, ops/events, content, activity), quick-action links (6 sub-pages), pending-apps alert banner, full settings tabs (General/Nav/Branding/Integrations — each with multiple sub-forms: guild name, ops settings, limits, nav visibility toggles, branding+event-types, Discord+Drive). Platform (`/admin/page.tsx`): simple link list to 5 admin modules (Config, Directory, Integrations, Members, Billing) — NO stats dashboard, NO quick-action KPIs.

### 3b. Admin → Members

- [PARTIAL] Both have a member table with rank display and rank-change controls.
- [DIFFERENT] FG: `MembersTable` component (not read here but uses full filtering, pagination, search by name/rank/tier). Platform: inline table with `RankControls` + `LoginLinkButton` (magic login-link for impersonation — FG has no equivalent).
- [MISSING] FG admin/members has filtering/search. Platform: no search/filter — full flat list only.
- [DIFFERENT] Platform adds a "Login link" column (impersonation magic-link) not present in FG.

### 3c. Admin → Ranks

- [MISSING] FG has `/admin/ranks` page with full rank CRUD (create, edit with `EditRankButton`, delete, sort order management, member count per rank). Platform has NO `/admin/ranks` route — ranks exist in the DB (`tier` enum: ENLISTED/NCO/OFFICER/COMMAND) but rank management is baked in as `RankControls` on the members page; no separate rank-definition admin.

### 3d. Admin → News

- [MISSING] FG has `/admin/news` (list), `/admin/news/create`, `/admin/news/[articleId]/edit` — full news CMS admin with create/edit/publish. Platform: news is managed inline from the `/news` page (member-facing create). No dedicated admin news CMS route.

### 3e. Admin → Forums

- [MISSING] FG has `/admin/forums` — admin for forum category management (create, edit, reorder, delete). Platform: no admin forums page. Forum categories are either pre-seeded or managed via DB; there is no UI for it.

### 3f. Admin → Applications

- [MISSING] FG has `/admin/applications` — full recruitment application review page (applicant details, motivation, accept/reject with notes). Platform: no applications admin. The platform has a `recruitment` feature (officer-visible `/recruitment` route) but no public-facing recruit form and no application inbox.

### 3g. Admin → Squads

- [MISSING] FG has `/admin/squads` page. Platform: squads exist as a feature but there is no admin squads management page.

### 3h. Platform Admin → Config

- [MISSING in FG] Platform `/admin/config` covers: Branding (name, tagline, color palette, preset), Labels (custom label overrides), Feature Toggles (per-feature on/off with plan gating), Custom Fields editor. FG has equivalent settings buried in the admin dashboard tabs (BrandingSettingsForm, NavSettingsForm etc.) but they are on the same `/admin` page, not separated into sub-routes.

### 3i. Platform Admin → Directory

- [MISSING in FG] Platform `/admin/directory` — controls whether the org is listed on the public or9.space directory and its tagline. FG has no directory concept.

### 3j. Platform Admin → Billing

- [MISSING in FG] Platform `/admin/billing` — plan status (FREE/PAID), upgrade flow via Stripe, self-hosted mode detection. FG has no billing.

### 3k. Platform Admin → Integrations

- [PARTIAL vs FG] FG: Discord settings (webhook URL, bot token, guild ID) + Google Drive (folder ID + API key) in the main admin settings tabs. Platform `/admin/integrations`: Discord guild ID + bot token (PAID only) + Google Calendar ID only — no Drive integration.

---

## 4. Notifications

### 4a. Notifications Bell (navbar)

- [DIFFERENT] FG: rich `NotificationsBell` component — typed notifications API, dropdown popup with up to 5 items, read/unread indicators, mark-all-read, "View all" link, 30 s polling. Platform: plain `<Bell>` icon linking to `/messages` with SSR unread DM count — no notification dropdown, no typed notification system in the chrome.

### 4b. Notifications Full Page (`/notifications`)

- [MISSING] FG has `/notifications/page.tsx` — full inbox page with all notifications, type icons (MESSAGE/AWARD/EVENT/PROMOTION/DEMOTION/FORUM_REPLY/NEWS/SYSTEM), per-item mark-read, mark-all-read, linked notification items. Platform: **NO `/notifications` route** — neither the page nor the API exists. The Bell icon redirects to `/messages` instead.

### 4c. Notification Types

- [MISSING] FG notification system covers: MESSAGE, AWARD, EVENT, PROMOTION, DEMOTION, FORUM_REPLY, NEWS, SYSTEM. Platform: no notification entity at all — only unread DM count is surfaced.

---

# Parity Audit — Core

Audited: 2026-06-17. Read-only comparison of FreedomGuard source against or9.space platform source.
Legend: MATCH = present + same composition | PARTIAL = present but simpler/different | MISSING = not on platform | DIFFERENT = present but clearly unlike FG.

---

## Dashboard (FG `/` → platform `components/dashboard/org-dashboard.tsx`)

- [PARTIAL] Welcome header (name + "Daily briefing.") — MATCH on text; platform uses viewer.displayName|username, FG uses session userName. Same output.
- [PARTIAL] Quick-stats MFD strip — Platform present but feature-gated: only shows stats for enabled features (forums thread count replaces FG's "Unread Messages"). FG always shows 4 fixed stats (Members, Active Ops, Unread Messages, Upcoming Events); platform shows 1–7 depending on features.
- [MISSING] Discord Online stat in MFD strip — FG has a live Discord member-count item with link to /discord; platform has no Discord stat.
- [MISSING] Voice Channels live panel ([ COMMS LIVE ] amber MfdPanel with pulsing indicators) — FG renders this when Discord voice channels are active; no equivalent on platform.
- [MATCH] Announcements panel ([ ANNOUNCEMENTS ] primary chassis, pinned badge, author, body preview, "View All" link) — structurally identical; platform adds a CategoryBadge and date, FG omits those.
- [PARTIAL] Announcements — news item category badge — Platform shows CategoryBadge per post; FG does not. Minor addition, not a gap.
- [MATCH] Activity Tape panel ([ ACTIVITY TAPE ] neutral chassis, ActivityItem list, "View All" link, empty state) — present on both; platform uses a different ActivityItem prop shape (entry+timeAgo fn vs item object) but same visual panel.
- [PARTIAL] Activity Tape empty state — FG uses `<EmptyState>` component with icon; platform uses bare `<p>` text. Slightly degraded.
- [MATCH] Mission Clock panel ([ MISSION CLOCK ] neutral chassis, upcoming events list with type badge) — present on both; platform uses EventTypeBadge component vs FG's inline Badge lookup.
- [DIFFERENT] Mission Clock event detail line — FG shows weekday + formatted time + RSVP count badge; platform shows formatDateTime + "· N going" text. Layout equivalent but different fields.
- [MISSING] AdSlot (sidebar-bottom) — Platform renders `<AdSlot slot="sidebar-bottom">` below grid; FG has no ads. Not a gap for FG parity but noted.

---

## Activity (FG `/activity` → platform `/activity`)

- [MATCH] Page header (Activity icon, "Activity" title, subtitle) — present on both.
- [MISSING] Entity-type filter tabs (All / Operations / Events / Forum / Fleet / Members / News) — FG has 7 clickable tab pills with ?type= routing; platform has no filters at all.
- [MISSING] Pagination — FG paginates the activity feed with `<Pagination>` and page/type search params; platform loads a fixed 40 entries with no pagination UI.
- [PARTIAL] Feed container — FG wraps items in a `<Card>` with divide-y; platform wraps in an MfdPanel chassis="neutral". Different chrome but similar purpose.
- [MATCH] Empty state — both show a message when feed is empty (FG uses EmptyState component; platform uses bare `<p>`).
- [MATCH] ActivityItem rows — both render ActivityItem per entry.
- [PARTIAL] Entry count readout — Platform shows entry count in titleAside; FG has no count display.

---

## Roster (FG `/members` → platform `/members`)

- [MATCH] Page header (Users icon, "Roster"/"Members" title, member count) — present on both; wording differs ("Roster" vs "Members", "on record" phrasing same).
- [PARTIAL] Search input — FG uses a `<RosterFilters>` client component with debounce; platform uses a plain server-side MfdPanel form with SCAN submit button. Functional but less interactive.
- [PARTIAL] Tier filter — Both have tier filter (COMMAND/OFFICER/NCO/ENLISTED). FG is part of RosterFilters client component; platform is a `<select>` in a server form.
- [MISSING] Sort dropdown — FG has a sort parameter (via RosterFilters); platform has no sort control.
- [MISSING] Squad filter — FG has a squad filter dropdown; platform has no squad filter.
- [MISSING] Reputation leaderboard card (Top Contributors with pts) — FG renders a "Top Contributors" card above the roster if reputation feature is enabled; platform has no leaderboard widget on this page.
- [MATCH] List view — both render member rows with avatar, name, handle, rank, join date.
- [PARTIAL] List view stat pills (forum posts, ops, events, ships, awards) — FG shows 5 stat pills per row in list view; platform list view shows only rank + join date, no activity stats.
- [MISSING] Grid view stat grid (4-cell ops/posts/ships/awards block) — FG grid cards have a stat grid at the bottom with 4 counts; platform grid cards show only avatar, name, rank, and join date.
- [PARTIAL] Grid view — both support grid toggle; platform grid is simpler (no stat grid, no event RSVP pill).
- [MATCH] View toggle button (list/grid) — present on both.
- [PARTIAL] Admin rank editor inline — FG renders RankEditor inline in list/grid for COMMAND users; platform links to /admin/members. Different UX pattern.
- [MISSING] Squad-colored name animation (SquadNameColor gradient for multi-squad members) — FG applies color/animation to member names based on squad colors; platform has no squad color display.
- [MATCH] Empty state (no members found) — both show an empty state with explanatory text.
- [MATCH] Pagination — FG has `<Pagination>`; platform renders all members in a single pass (no pagination component). Gap if org is large.
- [DIFFERENT] List view grouping — Platform groups members by tier into separate MfdPanel sections; FG shows a flat list sorted by params. Different UX (platform is arguably cleaner for small orgs).

---

## Profile (FG `/members/[username]` → platform `/members/[username]`)

- [MATCH] Back-to-roster link — present on both.
- [MATCH] Identity block (avatar, display name, handle, rank badge, join date) — present on both.
- [PARTIAL] Identity block — FG shows avatar with RankBadge overlay + squad membership links with colored dots; platform shows avatar with mfd-cut clip, rank text + tier in parens, no squad links.
- [MISSING] Squad membership badges (colored pill links to /members?squad=) — FG shows squad pills with color swatches; platform has no squad display on profile.
- [MISSING] Bio field on identity card — FG shows bio inline in the header card; platform has it in a separate [ BIO ] panel (functionally present but layout differs — counted as PARTIAL).
- [PARTIAL] Bio panel — Platform shows [ BIO ] as a separate MfdPanel; FG shows bio inside the header Card. Both show bio text.
- [MISSING] RSI handle + verified badge — FG shows RSI handle with external link and "verified" pill; platform has no RSI handle display.
- [MISSING] Social links (Discord, Steam, Twitter/X, Website) — FG shows social link buttons on profile; platform has no social links display.
- [MISSING] Stats summary strip (Forum Posts, Events Attended, Operations, Awards Earned — 4 cards) — FG has a 4-card stat summary row; platform has no equivalent stats row (only thread/post counts in 2 amber panels).
- [PARTIAL] Thread/post stat panels — Platform shows [ THREADS ] and [ POSTS ] amber panels; FG covers these counts in the 4-card stats strip and in Recent Forum Activity. Partial overlap.
- [MISSING] Loot Points card (LootProfileCard) — FG shows loot rank/points for the member; platform has no loot display on profile.
- [MISSING] Handbook sign-off card (HandbookSignOffProfileCard) — FG shows handbook completion status; platform has no handbook display.
- [MISSING] Reputation card (by-category breakdown) — FG shows total reputation and per-category breakdown; platform has no reputation display.
- [MISSING] Play Schedule / Availability grid (AvailabilityGrid) — FG shows the member's weekly availability heatmap; platform has no availability display.
- [MISSING] Rank History panel (full promotion history with dates, promoted-by, notes) — FG shows full rank history; platform has no rank history on profile.
- [MISSING] Awards & Commendations panel (medals with category, citation, date, nominator) — FG shows full awards list; platform has no awards display.
- [MISSING] Recent Forum Activity panel (linked posts with thread title, excerpt, timestamp) — FG shows last N forum posts; platform has no forum activity on profile.
- [MISSING] Event Attendance panel (RSVPs with status badge, date, link) — FG shows event attendance history; platform has no event attendance display.
- [MISSING] Operation History panel (signups with role, status badge, date, link) — FG shows operation participation history; platform has no operation history display.
- [PARTIAL] Own-profile edit — FG redirects to /settings/profile; platform shows an inline [ EDIT PROFILE ] MfdPanel on the profile page when viewing your own profile. Platform is more integrated.

---

## Messages (FG `/messages` → platform `/messages`)

- [MATCH] Page header (MessageSquare icon, "Messages" title, subtitle) — both have a header.
- [MATCH] Conversations list panel — both render a list of conversations with participant name, unread indicator, last message preview, and "open" affordance.
- [PARTIAL] Conversations list — FG has conversations in a sidebar (fixed 320px left column) with avatar, name, last message, timestamp; platform uses a simple MfdPanel list with name + last message + count badge. Platform is simpler.
- [MISSING] Two-pane chat layout (fixed sidebar + message thread right panel) — FG is a full two-pane chat UI at 100vh; platform is a simple list-only page (clicking opens /messages/[id] on a separate route).
- [MISSING] Real-time message thread view (inline message bubbles, send input, auto-scroll) — FG renders the full conversation inline with real-time Supabase subscription, optimistic sends, message bubbles; platform's list page has no inline thread view.
- [MISSING] New conversation composer (DM tab + Group tab with member checkboxes, first-message textarea) — FG has an expandable new-message panel in the sidebar with DM/Group tabs; platform has a `<NewConversationForm>` button (imported but form detail limited).
- [MISSING] Group conversations (isGroup flag, participant count, group name) — FG supports named group conversations; platform's data model may support it but the page doesn't show group indicators.
- [MISSING] Message edit / delete actions (hover edit pencil + trash with confirm dialog) — FG has inline edit and delete with ConfirmDialog; platform list page has no message actions.
- [PARTIAL] Empty state — FG shows EmptyState component; platform shows an icon + mfd-label text. Both functional.
- [MISSING] Real-time subscription (useRealtimeMessages hook) — FG maintains a live Supabase subscription for new/edited/deleted messages; platform has no real-time layer.

---

## Settings (FG `/settings/profile` + `/settings/availability` → platform `/settings`)

- [MATCH] Page header (Settings icon, title, username readout) — platform has PageHeader with username; FG profile page has no explicit page header (form is top-level).
- [PARTIAL] Profile card (avatar preview, avatar URL input, display name, bio) — both present; same fields. FG uses Card/CardHeader; platform uses MfdPanel chassis="neutral".
- [MISSING] RSI Account card (link/verify/unlink RSI handle) — FG has a full RSI linking card with verify+unlink flow; platform has no RSI section in settings.
- [MISSING] Social Links card (Discord, Steam, Twitter/X, Website inputs) — FG has a Social Links card; platform has no social links in settings.
- [MISSING] Notifications card (5 toggles: DMs, event reminders, promotions, news, forum replies) — FG has a notification preferences card; platform has no notification settings.
- [MISSING] Timezone card (full IANA timezone select) — FG has a timezone selector in profile settings; platform has no timezone setting (though it's stored in the DB).
- [MISSING] Discord Sync card (conditional: shown when discord sync is enabled + user has discordId) — FG has a DiscordSyncCard; platform has no Discord sync UI.
- [MISSING] Availability / Play Schedule sub-page (`/settings/availability`) — FG has a full dedicated page with timezone select + interactive AvailabilityGrid (click-drag to mark hours); platform has no availability settings at all.
- [PARTIAL] Profile form save flow — FG has save button with saved/error feedback; platform's ProfileForm (imported component) presumably has the same. Marked PARTIAL pending component inspection.

---

## Recruit / Apply (FG `/recruit` → platform `/apply`)

- [DIFFERENT] Page layout and intent — FG `/recruit` is a rich dual-path landing page for unauthenticated users (Discord OAuth OR form application); platform `/apply` is a minimal centered form page. Completely different framing.
- [MISSING] Hero section (org logo image, "RECRUITMENT TERMINAL" label, "Enlist" stencil heading, tagline) — FG has a full hero with logo; platform has only a plain heading.
- [MISSING] Two-path grid (Discord card + Application card side-by-side) — FG offers Discord OAuth as the primary join path; platform is form-only with no Discord path.
- [MISSING] Discord OAuth sign-up button (signIn("discord")) — FG prominently offers Discord login; platform has no Discord auth path on apply page.
- [MISSING] "What We Expect" expectations list (numbered org expectations) — FG shows org-specific expectations; platform has no expectations section.
- [MISSING] Animated reveal for application form (grid-rows smooth expand on button click) — FG hides the form behind a reveal toggle; platform shows the form immediately.
- [PARTIAL] Application form fields — FG has: Star Citizen Username, Discord Username, Email, Experience Level (select), Motivation (textarea), Referral. Platform has: Desired Handle, Email, Name/Contact (optional), Why do you want to join (textarea). Partially overlapping but different fields.
- [MISSING] Experience level selector — FG has a 4-option experience dropdown; platform has no experience field.
- [MISSING] Referral source field — FG asks "How did you hear about us?"; platform does not.
- [MATCH] Success / confirmation state — both show a success message after submission. Platform uses an inline MfdPanel banner; FG uses a full centered confirmation screen with CheckCircle icon.
- [PARTIAL] Success confirmation — FG has a styled "TRANSMISSION RECEIVED" MFD frame with CheckCircle; platform has a small inline banner. FG is more polished.
- [DIFFERENT] Feature gating — Platform requires `recruitment` feature flag to be enabled, otherwise 404s; FG has no feature flag (always visible to logged-out users).

---

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

---

# Content Pages Parity: FreedomGuard → or9.space Platform
_Audited: 2026-06-16_

---

## Forums Index

- [MATCH] Page header (icon + title + subtitle)
- [MISSING] ForumSearch component — FG has a live search bar; platform has no search on the forums index
- [MATCH] Empty state when no categories exist
- [MATCH] Category list with name, description, thread count
- [PARTIAL] Thread/post counts per category — FG shows thread count only; platform shows both thread count and post count (platform is richer here, not a gap)
- [MATCH] Latest thread strip (title + author) per category
- [DIFFERENT] Summary stats strip — platform adds a global CATEGORIES / THREADS / POSTS readout row; FG has none (platform richer)
- [MISSING] Admin "Manage Categories" link — platform shows it only for COMMAND tier; FG did not expose this inline (actually platform has this; FG does not — platform richer)

> Net FG→platform gap: **ForumSearch** is the only regression.

---

## Forum Category

- [MATCH] Breadcrumb / back navigation
- [MATCH] Category name header + description
- [MATCH] Thread list: title, pin/lock icons, author, relative time
- [MATCH] Post count per thread
- [MISSING] View count per thread — FG shows `Eye` icon + viewCount; platform omits view count column
- [MATCH] Empty state for zero threads
- [MATCH] New-thread form (gated by login status)
- [PARTIAL] Stats row — platform adds THREADS / PINNED / LOCKED readouts; FG lacks these (platform richer, not a regression)

---

## Forum Thread

- [MATCH] Breadcrumb (Forums / Category / Thread)
- [MATCH] Thread title header with lock/pin icons
- [MATCH] Thread locked notice
- [MATCH] Mod actions (pin/lock/unlock for admins/officers)
- [MATCH] Post list with author, timestamp, OP marker, edited marker
- [MATCH] Avatar / author column (sidebar on desktop, inline on mobile)
- [MISSING] RankBadge per post author — FG shows the user's current org rank below their avatar; platform shows only name and initials box, no rank badge
- [MISSING] Markdown rendering for post content — FG uses `MarkdownContent` (full markdown); platform renders `whitespace-pre-wrap` plain text only
- [MATCH] Edit/delete own post actions
- [MATCH] Reply form (locked-thread aware)
- [MISSING] Pagination — FG has paginated posts (page query param, `<Pagination>`); platform loads all posts in a single query, no pagination

---

## News Index

- [MATCH] Page header (icon + title + subtitle)
- [MISSING] Category / search filter bar — FG has `<NewsFilters>` (category dropdown + text search); platform has no filtering
- [MATCH] Article list with title, category badge, author, date
- [MISSING] Article excerpt/summary on card — FG shows `article.excerpt`; platform cards show title + meta only, no excerpt
- [MATCH] Pinned indicator per article
- [MATCH] Empty state
- [MISSING] Comment count per article — FG shows comment count icon on each card; platform omits it

---

## News Article

- [MATCH] Back-to-news navigation
- [MATCH] Article title (h1)
- [MATCH] Category badge
- [MATCH] Pinned indicator
- [MATCH] Author + date meta row
- [MATCH] Admin edit/delete controls
- [MISSING] Markdown body rendering — FG uses `<MarkdownContent>`; platform renders plain `whitespace-pre-wrap` text
- [MISSING] Author avatar on article header — FG shows `<Avatar>` component; platform shows name only
- [MISSING] Comments section — FG has a full comment thread (list + add-comment form); platform has no comments on news articles

---

## Calendar / Events Index

- [MATCH] Page header (icon + title + subtitle)
- [MATCH] Officer "New Event" action button
- [DIFFERENT] Layout is fundamentally different — FG renders a full interactive monthly grid calendar (`CalendarClient`: month nav, day cells with colored event dots, click-day to filter) plus a sidebar of upcoming events; platform renders a simple list view grouped by date (upcoming + past panels). No calendar grid in platform.
- [MISSING] Monthly calendar grid with day cells — FG's core UI; entirely absent in platform
- [MISSING] Month navigation (prev/next chevrons) — only needed with calendar grid
- [MISSING] Per-day event dot indicators on the grid
- [MISSING] Operations merged into calendar — FG merges `getOperationsByMonth` results alongside events; platform shows events only
- [MATCH] Upcoming events list (platform's primary view)
- [PARTIAL] Past events — FG shows upcoming sidebar only; platform adds a dedicated past-events panel (platform richer in this regard)
- [MATCH] Event card: type badge, title, time, location, RSVP count

---

## Event Detail

- [MATCH] Page header with title + event type badge
- [MATCH] Officer edit/delete controls
- [MATCH] Start/end date-time display
- [MATCH] Location display
- [MATCH] Created-by attribution
- [MATCH] Description/briefing section
- [MATCH] RSVP buttons (Going / Maybe / Declined)
- [MATCH] Going roster list
- [MATCH] Maybe roster list
- [MISSING] Declined roster — FG shows a Declined group in the RSVP sidebar; platform only shows Going + Maybe panels
- [MISSING] iCal / "Add to Calendar (.ics)" download link — FG provides `/api/events/{id}/ical`; platform has no calendar export
- [MISSING] Event comments / discussion section — FG has a full comment thread; platform has no comments on events
- [MISSING] Recurrence badge — FG shows a "Recurring: weekly" badge when `isRecurring`; platform has no recurrence UI
- [DIFFERENT] RSVP sidebar — FG uses a 3-column grid (main + sidebar); platform uses full-width panels stacked

---

## LFG

- [MATCH] Page header (icon + title + subtitle)
- [MATCH] Create LFG form (always shown to logged-in users)
- [MATCH] Post list with title, body, author, date, status
- [MISSING] Activity-type filter tabs — FG has 11 activity tabs (ALL / MINING / TRADING / COMBAT etc.); platform has no activity filtering
- [MISSING] Activity-type badge per post — FG's `LfgCard` shows an activity badge (MINING, COMBAT…); platform shows only status (OPEN/CLOSED) inline, no activity type
- [MISSING] Players-needed / response count display — FG shows `N/M players` + response count; platform shows no capacity info
- [MISSING] Scheduled time per post — FG shows `scheduledAt` with Clock icon; platform omits scheduled time
- [MISSING] Join / Apply button for non-owners — FG has an interactive Join button with responded state; platform has no join action on the list view
- [MISSING] Status badge (OPEN / FILLED / CLOSED / EXPIRED) — FG shows an explicit status badge; platform only dims closed posts with "Closed" label
- [MISSING] Avatar per post author — FG shows `<Avatar>` component; platform shows text name only

---

## Resources

- [MATCH] Page header (icon + title + subtitle)
- [MATCH] Create resource form (gated by role)
- [MATCH] Resource list with title, category, author
- [MISSING] Google Drive browser — FG integrates `<DriveBrowser>` when a Drive folder is configured; platform has no Drive integration
- [MISSING] Masonry/grid card layout — FG shows 2-3 column grid cards with content preview; platform uses a flat list
- [MISSING] Tag display per resource — FG shows tag pills; platform has no tag rendering
- [MISSING] Content excerpt on card — FG shows `line-clamp-3` of resource content; platform shows no preview text on list items
- [MISSING] Resource detail page (slug route) — FG has `/resources/[slug]` with full markdown content, avatar, tags, edit actions; platform has no detail route (list only, URL link opens externally if `r.url` set)
- [PARTIAL] URL-based resources — platform supports external URL links; FG only has markdown content resources (different model; neither is strictly a gap)

---

## Gallery

- [MATCH] Page header (icon + title + subtitle)
- [MATCH] Upload form
- [MATCH] Grid of media items (image, title, caption, author)
- [MISSING] Media type filter tabs — FG has SCREENSHOT / VIDEO / ART / MEME filter; platform has no type filtering
- [MISSING] Masonry/variable-height layout — FG uses `columns-1…4` CSS columns for a masonry effect; platform uses a uniform `grid-cols-2/3`
- [MISSING] Thumbnail with Next.js `<Image>` optimisation — FG uses `<Image>` with `thumbnailUrl`; platform uses plain `<img>` with `imageUrl`
- [MISSING] Comment count badge on card — FG shows comment count; platform omits it
- [MISSING] Gallery detail page (`/gallery/[id]`) — FG has a full detail page: lightbox viewer, description, avatar, comments section, edit/delete actions; platform has no detail route (no click-through)
- [MISSING] Lightbox / full-size media viewer — FG uses `<Lightbox>` component; absent in platform
- [MISSING] Comments on media items — FG has a full comment thread on detail page; platform has no comments

---

---

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

---

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
