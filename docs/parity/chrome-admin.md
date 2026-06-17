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
