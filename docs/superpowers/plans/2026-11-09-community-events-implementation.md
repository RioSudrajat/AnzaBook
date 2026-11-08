# Community Calendars & Luma-Inspired Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AnzaBook's Luma-inspired Community Calendars and Events feature with curated host calendars (Communities & Authors), a 2-column event creation studio (banner upload, theme selector, optional book/work linking, offline location search + 1 km draggable pin map), a chronological timeline feed with a Luma-style right slide-over event detail drawer (`Salin Tautan`, `Halaman Acara ↗`, `^`/`v` navigation), dynamic registration box states (`Minta untuk Bergabung`, `Daftar Tunggu`, `Daftar Acara`), address privacy gating (`Daftar untuk Melihat Alamat`), attendee avatar stacks (`[N] Akan Pergi`), and event reporting.

**Architecture:** We add five PostgreSQL tables (`community_calendars`, `community_calendar_members`, `community_calendar_followers`, `community_events`, `event_rsvps`, `event_reports`) in `apps/api/src/db/schema/events.ts`, strict Zod schemas and DTOs in `packages/shared`, and Express 5 routes/services under `/api/events` with row-level locking (`FOR UPDATE`) for RSVP capacity, address/link privacy masking before approval, and Haversine validation (`<= 1000m`) for adjusted map pins. On the web (`apps/web`), we add public routes (`/events/$slug`, `/c/$slug`), the 5th navigation tab (`Agenda`), a chronological timeline feed with a right slide-over event drawer, a 2-column Luma-style Event Studio with Canvas banner compression and interactive pin adjustment, plus contextual widgets on `DashboardHome` and `BookDetailPage`.

**Tech Stack:** Express 5, Drizzle ORM + PostgreSQL 17, Better Auth, Zod, TanStack Start + Router + Query, React 19, Tailwind CSS v4, HTML5 Canvas (banner compression), OpenStreetMap Nominatim/Photon + interactive tile map for draggable pin adjustment and dark/light venue map with `Maps ↗` button.

**Spec:** `docs/superpowers/specs/2026-11-09-community-events-plan.md`

## Global Constraints

- Request bodies are capped at 100 kB (`apps/api/src/middleware/body.ts`): uploaded event banner images must be resized/compressed via HTML5 Canvas (`maxDimension = 720`, JPEG quality `0.78`) to stay under 70 kB as a data URL or accept an `https://` URL.
- Only verified or trusted calendar members (`owner` / `admin`) or global `admin` can create or manage events under a calendar; regular users submit a host calendar application first.
- Linking a book from the AnzaBook catalog (`bookId`) is strictly optional (`nullable`); hosts may alternatively specify an external work (`featuredWork` for external books, films, or articles) or leave it empty.
- Offline pin adjustment (`latitude`, `longitude`) must be validated on both client and server to be within `1000` meters (1 km) of the geocoded source coordinates (`placeSourceLat`, `placeSourceLng`) when source coordinates are provided.
- Two concurrent RSVP requests for the last remaining seat must never exceed `capacity`; use a database transaction locking the `community_events` row (`FOR UPDATE`).
- Privacy gating:
  - Private online meeting links (`onlineMeetingUrl`) must NEVER be returned unless the requesting user has an active RSVP with status `"going"` or is a calendar manager.
  - When `hideAddressUntilApproved = true`, exact `venueName`, `venueAddress`, and exact pin coordinates must be masked (returning only `district` and `city` plus blurred/city-center coordinates) unless the viewer has status `"going"` or is a calendar manager.
- Copywriting must follow Indonesian language conventions and `antislop` rules: no em dashes, no generic AI buzzwords, minimum 44x44px touch targets on mobile.

## Review Focus

- Concurrent RSVPs when `capacity = 1`: second simultaneous caller receives status `"waitlisted"` (when `allowWaitlist = true`) or `409 EVENT_FULL` (when `allowWaitlist = false`), never `going` beyond capacity.
- Address & meeting link privacy leak: when `hideAddressUntilApproved = true`, anonymous callers or users with `pending_approval` / `waitlisted` status calling `GET /api/events/:slug` receive `venueName: null`, `venueAddress: null`, `onlineMeetingUrl: null`, and `isAddressHidden: true`, while still receiving `district` and `city` (e.g. `"Kecamatan Setiabudi, Daerah Khusus Ibukota Jakarta"`).
- Pin adjustment distance > 1 km: `POST /api/events` with `latitude`/`longitude` more than 1.0 km away from `placeSourceLat`/`placeSourceLng` rejects with `400 PIN_OUT_OF_BOUNDS`.
- Banner image size > 100 kB: client Canvas helper compresses images before submission, and validator enforces max string length on `coverUrl` (`<= 90000` chars).
- Canceling a `"going"` RSVP when someone is `"waitlisted"`: canceling frees the seat and automatically promotes the oldest `"waitlisted"` RSVP to `"going"`.

---

### Task 1: Shared Zod Validators, Permissions, and DTO Types for Calendars & Events

**Files:**
- Modify: `packages/shared/src/permissions.ts`
- Modify: `packages/shared/src/validators/community.ts`
- Modify: `packages/shared/src/types/api.ts`
- Test: `apps/api/src/test/events-validators.test.ts`

**Interfaces:**
- Produces in `@starter/shared/validators/community`:
  - `calendarTypeValues = ["community", "author", "publisher"] as const`
  - `eventTypeValues = ["book_club", "film_discussion", "silent_reading", "book_launch", "writing_session", "community_meetup"] as const`
  - `eventFormatValues = ["offline", "online", "hybrid"] as const`
  - `eventThemeValues = ["minimal", "classic_paper", "midnight_ink", "terracotta"] as const`
  - `featuredWorkSchema`, `coHostSchema`, `createCalendarSchema`, `createEventSchema`, `rsvpEventSchema`, `checkInRsvpSchema`, `reportEventSchema`, `listEventsQuerySchema`
  - `haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number`
- Produces in `@starter/shared/types`:
  - `CommunityCalendarDto`, `FeaturedWorkDto`, `EventCoHostDto`, `EventAttendeePreviewDto`, `CommunityEventSummaryDto`, `CommunityEventDetailDto`, `EventRsvpDto`

- [ ] **Step 1: Write the failing validator unit tests**

Create `apps/api/src/test/events-validators.test.ts` testing:
1. `createEventSchema` accepts an event without `bookId` and with `featuredWork: { mediaType: "film", title: "Laut Bercerita (Short Film)", creator: "Pritagita Arianegara" }`, `hideAddressUntilApproved: true`, `district: "Kecamatan Setiabudi"`, `city: "Daerah Khusus Ibukota Jakarta"`.
2. `createEventSchema` rejects an offline pin where `haversineDistanceMeters(latitude, longitude, placeSourceLat, placeSourceLng) > 1000`.
3. `createEventSchema` accepts `coverUrl` as either a valid `https://` URL or a `data:image/(jpeg|png|webp);base64,...` string up to `90000` characters, and rejects larger strings.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @starter/api test -- src/test/events-validators.test.ts`
Expected: FAIL with missing exports from `@starter/shared/validators/community`.

- [ ] **Step 3: Implement schemas, Haversine helper, permissions, and DTO types**

In `packages/shared/src/permissions.ts`, add `events: ["manage-any"]` to `statement` and `admin` role.
In `packages/shared/src/validators/community.ts`, implement `haversineDistanceMeters`, `featuredWorkSchema`, `coHostSchema`, `createCalendarSchema`, `createEventSchema`, `rsvpEventSchema`, `checkInRsvpSchema`, `reportEventSchema`, and `listEventsQuerySchema`.
In `packages/shared/src/types/api.ts`, add the calendar, event (including `isAddressHidden`, `district`, `city`, `logisticsNotes`, `categoryTag`, `coHosts`, `attendeeCount`, `attendeesPreview`), featured work, and RSVP DTO types, plus `upcomingEvents?: CommunityEventSummaryDto[]` on `BookDetailDto`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @starter/api test -- src/test/events-validators.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/permissions.ts packages/shared/src/validators/community.ts packages/shared/src/types/api.ts apps/api/src/test/events-validators.test.ts
git commit -m "feat(shared): add community calendar and event schemas and DTOs"
```

---

### Task 2: Database Schema, Migrations, and Seed Data for Community Calendars & Events

**Files:**
- Create: `apps/api/src/db/schema/events.ts`
- Modify: `apps/api/src/db/schema/index.ts`
- Modify: `apps/api/src/db/seed-anzabook.ts`
- Create: `apps/api/drizzle/<generated_migration>.sql`

**Interfaces:**
- Consumes: `user` from `apps/api/src/db/schema/user.ts`, `books` from `apps/api/src/db/schema/anzabook.ts`
- Produces in `apps/api/src/db/schema`:
  - `communityCalendars`, `communityCalendarMembers`, `communityCalendarFollowers`, `communityEvents`, `eventRsvps`, `eventReports`

- [ ] **Step 1: Define Drizzle tables in `apps/api/src/db/schema/events.ts` and export from `index.ts`**

Create `communityCalendars`, `communityCalendarMembers`, `communityCalendarFollowers`, `communityEvents` (including `bookId`, `featuredWork`, `title`, `description`, `logisticsNotes`, `coverUrl`, `themePreset`, `visibility`, `eventType`, `categoryTag`, `coHosts`, `format`, `district`, `city`, `venueName`, `venueAddress`, `hideAddressUntilApproved`, `latitude`, `longitude`, `placeSourceLat`, `placeSourceLng`, `onlineMeetingUrl`, `startsAt`, `endsAt`, `timezone`, `capacity`, `requiresApproval`, `allowWaitlist`, `status`, `parentEventId`), `eventRsvps`, and `eventReports`.

- [ ] **Step 2: Generate and apply Drizzle migration**

Run: `pnpm db:generate && pnpm db:migrate`
Expected: Migration SQL generated and applied cleanly to PostgreSQL.

- [ ] **Step 3: Add realistic initial calendars, events, and attendee RSVPs in `apps/api/src/db/seed-anzabook.ts`**

Seed 3 verified calendars and 4 upcoming events matching all Luma UI states:
1. Event with `requiresApproval: true` and `hideAddressUntilApproved: true` in `Kecamatan Setiabudi, Daerah Khusus Ibukota Jakarta` (shows *"Daftar untuk Melihat Alamat"* & *"Minta untuk Bergabung"*).
2. Event at full capacity with `allowWaitlist: true` at `GoWork Menara Rajawali - Coworking and Office Space` (shows badge *"Daftar Tunggu"* in timeline and *"Acara Penuh"* + *"Daftar Tunggu"* in drawer).
3. Offline Book Club event linked to an AnzaBook catalog book (`bookId`) with open registration and full venue map.
4. Film & Book discussion event using `featuredWork` (`mediaType: "film"`).

- [ ] **Step 4: Verify typecheck across monorepo**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schema/events.ts apps/api/src/db/schema/index.ts apps/api/src/db/seed-anzabook.ts apps/api/drizzle
git commit -m "feat(db): add community calendars, events, rsvps, and reports schema"
```

---

### Task 3: Events & Calendars API Service and Routes (Privacy Masking, Concurrency-Safe RSVP, Waitlist, Check-in, Reports)

**Files:**
- Create: `apps/api/src/services/events.service.ts`
- Create: `apps/api/src/routes/events.routes.ts`
- Modify: `apps/api/src/routes/index.ts`
- Modify: `apps/api/src/services/books.service.ts`
- Test: `apps/api/src/test/events.test.ts`

**Interfaces:**
- Consumes: `communityCalendars`, `communityEvents`, `eventRsvps`, `eventReports` from `../db/schema`, validators from `@starter/shared/validators/community`
- Produces HTTP endpoints mounted at `/api/events`:
  - `GET /api/events` (list public upcoming events ordered by `startsAt` with attendee preview avatars, count, and viewer RSVP status)
  - `GET /api/events/calendars` (list verified calendars + user's calendars)
  - `GET /api/events/calendars/:slug` (calendar detail + events)
  - `POST /api/events/calendars` (authenticated: apply/create host calendar)
  - `POST /api/events/calendars/:slug/follow` (authenticated: toggle follow)
  - `GET /api/events/locations/suggestions` (authenticated: returns matching `storeBranches` + recent calendar venues)
  - `GET /api/events/:slug` (public event detail; masks `onlineMeetingUrl` and masks `venueName`/`venueAddress` when `hideAddressUntilApproved` unless viewer is `"going"` or host)
  - `POST /api/events` (authenticated host/admin: create event)
  - `POST /api/events/:slug/rsvp` (authenticated: concurrency-safe RSVP with `FOR UPDATE`, handles `going`, `pending_approval`, `waitlisted`)
  - `DELETE /api/events/:slug/rsvp` (authenticated: cancel RSVP and auto-promote oldest `waitlisted` user to `going`)
  - `POST /api/events/:slug/rsvp/:rsvpId/approve` (authenticated host: approve `pending_approval` RSVP -> `going`)
  - `POST /api/events/:slug/check-in` (authenticated host: mark attendee `checkedInAt` by `checkinCode` or `userId`)
  - `POST /api/events/:slug/report` (authenticated: submit event report per `COM-03`)

- [ ] **Step 1: Write failing integration tests in `apps/api/src/test/events.test.ts`**

Write tests covering:
1. Host calendar creation and event creation with `featuredWork` (no `bookId`) vs catalog `bookId`.
2. Offline event creation rejecting a pin > 1 km from `placeSourceLat`/`placeSourceLng` (`400 PIN_OUT_OF_BOUNDS`).
3. Address & meeting URL privacy masking: when `hideAddressUntilApproved = true` and `requiresApproval = true`, `POST /api/events/:slug/rsvp` sets status `"pending_approval"`, and `GET /api/events/:slug` returns `isAddressHidden: true`, `venueName: null`, `venueAddress: null`, `district: "Kecamatan Setiabudi"`, `city: "Daerah Khusus Ibukota Jakarta"`. Once the host approves the RSVP (`status = "going"`), `GET /api/events/:slug` reveals the full `venueName`, `venueAddress`, and `onlineMeetingUrl`.
4. Concurrency-safe capacity & waitlist promotion: when `capacity = 1`, two concurrent `POST /api/events/:slug/rsvp` calls result in 1 `"going"` and 1 `"waitlisted"`; canceling the `"going"` RSVP promotes the `"waitlisted"` user to `"going"`.
5. Host check-in and event reporting (`POST /api/events/:slug/report`).

- [ ] **Step 2: Run integration tests to verify they fail**

Run: `pnpm --filter @starter/api test -- src/test/events.test.ts`
Expected: FAIL with 404 / missing `events.service.ts`.

- [ ] **Step 3: Implement `events.service.ts`, `events.routes.ts`, register in `routes/index.ts`, and include `upcomingEvents` in `getBookBySlug`**

Implement all service functions and routes, and update `getBookBySlug` in `apps/api/src/services/books.service.ts` to include `upcomingEvents`.

- [ ] **Step 4: Run integration tests to verify they pass**

Run: `pnpm --filter @starter/api test -- src/test/events.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/events.service.ts apps/api/src/routes/events.routes.ts apps/api/src/routes/index.ts apps/api/src/services/books.service.ts apps/api/src/test/events.test.ts
git commit -m "feat(api): implement community calendars, events, privacy masking, waitlist, and check-in"
```

---

### Task 4: Web API Client, Hooks, 2-Column Create Event Studio, and Luma-Style Event Detail Drawer

**Files:**
- Create: `apps/web/src/features/events/api.ts`
- Create: `apps/web/src/features/events/queries.ts`
- Create: `apps/web/src/features/events/hooks.ts`
- Create: `apps/web/src/features/events/components/location-picker-popover.tsx`
- Create: `apps/web/src/features/events/components/adjust-pin-map-dialog.tsx`
- Create: `apps/web/src/features/events/components/create-event-dialog.tsx`
- Create: `apps/web/src/features/events/components/apply-calendar-dialog.tsx`
- Create: `apps/web/src/features/events/components/event-detail-view.tsx`
- Create: `apps/web/src/features/events/components/event-detail-drawer.tsx`

**Interfaces:**
- Consumes: `/api/events/*` endpoints and DTOs/validators from `@starter/shared`
- Produces:
  - Hooks in `apps/web/src/features/events/hooks.ts`
  - `LocationPickerPopover` & `AdjustPinMapDialog` (Luma Screenshots 2 & 3)
  - `CreateEventDialog` (Luma Screenshot 1: 2-column studio with 1:1 Banner uploader + Canvas compression, theme selector, date/time + timezone, location picker + `hideAddressUntilApproved` toggle, optional work linker, and capacity/approval toggles)
  - `EventDetailView` & `EventDetailDrawer` (Luma Screenshots 4–8: reusable across the right slide-over drawer and full `/events/$slug` page, featuring Top Bar with `>>`, `Salin Tautan`, `Halaman Acara ↗`, and `^`/`v` prev/next event buttons; 1:1 Banner; Calendar date badge + time; Location row with `Daftar untuk Melihat Alamat` support; Registration Box with user avatar/email greeting and dynamic `Minta untuk Bergabung` / `Daftar Tunggu` / `Daftar Acara` button; structured `Tentang Acara` & `Lokasi - Cara Menuju Venue`; Map with `Maps ↗` overlay button; `Diselenggarakan Oleh` host list; `[N] Akan Pergi` avatar stack + names; `Hubungi Penyelenggara`, `Laporkan Acara`, and `# Kategori` pill).

- [ ] **Step 1: Implement `api.ts`, `queries.ts`, and `hooks.ts` in `apps/web/src/features/events/`**

Create isomorphic API calls, query options, and mutation hooks.

- [ ] **Step 2: Build `location-picker-popover.tsx`, `adjust-pin-map-dialog.tsx`, `create-event-dialog.tsx`, and `apply-calendar-dialog.tsx`**

Implement the location autocomplete + 1 km draggable pin modal and the 2-column Luma-style Create Event studio with Canvas banner upload.

- [ ] **Step 3: Build `event-detail-view.tsx` and `event-detail-drawer.tsx`**

Implement the exact Luma event detail anatomy (registration box states, masked vs full address map with `Maps ↗`, attendee avatar stack, host list, report modal, and drawer header bar with `Salin Tautan`, `Halaman Acara ↗`, and `^`/`v` navigation).

- [ ] **Step 4: Run web typecheck to verify all components and hooks compile**

Run: `pnpm --filter @starter/web typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/events
git commit -m "feat(web): add Luma event studio, interactive pin picker, and slide-over event detail drawer"
```

---

### Task 5: Timeline Feed in `Agenda` Tab, Public Pages (`/events/$slug`, `/c/$slug`), and Home/Book Integration

**Files:**
- Create: `apps/web/src/features/events/components/dashboard-events.tsx`
- Create: `apps/web/src/routes/events.$slug.tsx`
- Create: `apps/web/src/routes/c.$slug.tsx`
- Modify: `apps/web/src/features/dashboard/components/app-sidebar.tsx`
- Modify: `apps/web/src/routes/_protected/app.tsx`
- Modify: `apps/web/src/features/dashboard/components/dashboard-home.tsx`
- Modify: `apps/web/src/routes/books.$slug.tsx`

**Interfaces:**
- Consumes: components and hooks from `apps/web/src/features/events/*`
- Produces:
  - `DashboardEvents` (`/app?tab=events`): renders the Luma-style **Vertical Timeline Feed (`Acara Terdekat`)** grouped by date (`Besok Selasa`, `12 Nov Kamis`, etc.) with horizontal event cards (time, title, host avatars + names, venue/district, `Daftar Tunggu` badge, attendee avatar stack `+N`, and 1:1 right thumbnail). Clicking any card opens `EventDetailDrawer` on the right!
  - Public routes `/events/$slug` (full-page event view using `EventDetailView`) and `/c/$slug` (Host Calendar hub page with timeline feed + drawer)
  - 5th tab `Agenda` in `AppSidebar` and Mobile Bottom Navigation in `app.tsx`
  - `DashboardHome` and `BookDetailPage` (`/books/$slug`) event sections

- [ ] **Step 1: Create `dashboard-events.tsx`, `/events/$slug.tsx`, and `/c/$slug.tsx`**

Build the chronological timeline feed with the slide-over drawer in `dashboard-events.tsx` and `/c/$slug.tsx`, and the standalone shareable page at `/events/$slug.tsx`.

- [ ] **Step 2: Wire the `Agenda` tab into `app-sidebar.tsx` and `app.tsx`, and integrate events into `dashboard-home.tsx` and `books.$slug.tsx`**

Add `"events"` to `AppTab` and `appSearchSchema`, add the `Agenda` nav button in desktop sidebar and mobile bottom bar, and render upcoming events in `DashboardHome` and `/books/$slug`.

- [ ] **Step 3: Run full monorepo check and production build**

Run: `pnpm check && pnpm build`
Expected: Lint, typecheck, API tests, and Vite SSR build all PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): integrate Agenda timeline feed, slide-over drawer, and public event pages"
```
