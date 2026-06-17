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
