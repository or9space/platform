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
