# Issue #23 — Spot Ratings & Reviews, Community Spot Submission Flow & Admin Moderation Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task on a scoped feature branch (`feat/23-reading-spots-reviews-moderation`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the interactive community loop and admin moderation workflow for Peta Sudut Baca Indonesia: 1–5 star ratings & Reading Vibe Tags inside `SpotDetailPanel`, multi-step `"Usulkan Sudut Baca"` submission wizard with geocode proxy + 100m duplicate guard + `"Kontribusi & Favorit Saya"` drawer, spot/review reporting, `"Sudut Baca"` moderation tab in `/admin`, and full vertical Playwright E2E verification.

**Architecture:** All shared Zod contracts (`@starter/shared/validators/spots`), DTOs (`@starter/shared/types`), PostgreSQL schema, rate-limited `/api/spots/*` endpoints, and `/api/admin/spots/*` endpoints are already merged on `main` (`2a6e67b`). Issue #23 is purely a web + E2E vertical slice: extend `apps/web/src/features/spots/` and `apps/web/src/features/admin/` with strict contract-first hooks, a shared native `<dialog>` shell (`showModal()` + CSS `overscroll-behavior: contain` without mutating `body` overflow), a lazy-loaded MapLibre pin picker with non-WebGL coordinate fallback, and an end-to-end Playwright suite running against production builds + seeded disposable PostgreSQL.

**Tech Stack:** TanStack Start + TanStack Router + TanStack Query, React 19, TypeScript, Tailwind CSS v4 (Furrow tokens), Zod (`@starter/shared/validators/spots`), MapLibre GL JS (lazy dynamic import), Vitest (helper unit tests), Playwright (`e2e/reading-spots.spec.ts`).

**Spec:** GitHub Issue `RioSudrajat/AnzaBook#23` (Master Plan Slice 5; depends on merged #19, #20, #21, #22).

---

## Global Constraints

- **Git & Branching:** Never commit to `main` or `production`; branch off latest `origin/main` (`2a6e67b`) as `feat/23-reading-spots-reviews-moderation`. Keep PR tied to `Closes #23`.
- **No Drizzle Migrations:** `apps/api/drizzle/` and backend schema MUST NOT be modified.
- **No Direct Nominatim Calls from Browser:** Geocode search MUST go exclusively through `GET /api/spots/geocode?q=`.
- **Zero `dangerouslySetInnerHTML`:** All user reviews, descriptions, report details, and rejection reasons render strictly as plain React text.
- **URL Safety:** Validate community Google Maps URLs with `googleMapsUrlSchema` from `@starter/shared/validators/spots`; sanitize website/social/asset URLs via `safeExternalHref`, `safeSocialHref`, and `isUsableAssetUrl`. Never perform server-side fetch to user URLs.
- **Design System (Furrow / Anti-Slop / Hallmark):** Route all colors & fonts through CSS tokens (`--color-paper`, `--color-paper-2`, `--color-ink`, `--color-accent`, `--color-accent-text`, `--color-green`, `--color-error`, `Literata`, `Plus Jakarta Sans`, `Red Hat Mono` with `tabular-nums`). Zero purple/neon gradients, zero nested cards inside cards, zero `width`/`height`/`top`/`left` CSS animations (animate `transform`/`opacity` only), respect `prefers-reduced-motion: reduce`.
- **Accessibility & Mobile-First:** Minimum `44x44px` tap targets, distinct `:focus-visible`, zero horizontal overflow (`fitsWidth(page) === true`), native `<dialog>` (`showModal()`, `aria-labelledby`, `data-lenis-prevent`, `overscroll-behavior: contain` on `dialog:modal` & `overflow: hidden; overscroll-behavior: contain` on `dialog::backdrop`).
- **Local Verification Caveat:** Root `pnpm lint` scans stale local `.worktrees/` if present; locally verify `pnpm exec eslint apps packages e2e && pnpm exec prettier --check apps packages e2e && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`, and confirm all GitHub Actions CI jobs pass.

## Approaches Considered (Key Design Calls)

1. **Pin Precision Picker in `SubmitSpotDialog` Step 1:**
   - _Chosen:_ Lazy-loaded MapLibre GL JS mini picker (`SpotPinPickerMap`) with draggable marker + click-to-place constrained to `INDONESIA_BBOX`, paired with an automatic non-WebGL fallback (Indonesia city quick-presets + clamped lat/lng inputs). Matches `ReadingSpotsMap`, supports mobile touch/pinch-zoom, respects light/dark tokens, and stays deterministic in headless Chromium/WebGL-less devices.
   - _Rejected:_ Adapting `AdjustPinMapDialog` (3×3 CartoDB raster grid) — mouse-only drag, hardcoded dark styling, external raster dependency.
2. **Modal & Drawer Primitive:**
   - _Chosen:_ Reusable native `<dialog>` wrapper (`SpotModalDialog`) using `showModal()`, `closedby="any" | "closerequest"` (with Safari pointer fallback for light-dismiss), `data-lenis-prevent`, and CSS `dialog:modal` + `dialog::backdrop` scroll containment per `modern-web-guidance`. Provides true top-layer stacking above MapLibre/AppShell without z-index wars or `body` overflow layout shifts.
   - _Rejected:_ Custom fixed `<div>` backdrops with manual focus traps and `useBodyScrollLock` mutating `document.body.style.overflow`.
3. **Admin "Selesaikan Laporan" Flow:**
   - _Chosen:_ Use existing `PATCH /api/admin/spots/:id/moderate` (`moderateAdminSpot` atomically marks all `open` reports on that spot as `resolved` within the DB transaction). Sending `{ action: "approve", ...optionalEdits }` on a `published` spot resolves open reports while keeping it live; `{ action: "mark_closed" }` closes it and resolves open reports. Zero new backend routes required.

## Review Focus (Edge Cases Pinned by Tests)

1. **API Rate Limits (`429`) & Duplicate Reports (`409`):** Submitting past `postSpotRateLimit` (5/day), `putReviewRateLimit` (10/hr), `postReportRateLimit` (10/day), or reporting the same open reason twice (`409 DUPLICATE_OPEN_REPORT`) must display the API's Indonesian message via `role="alert"` without clearing user input or crashing. _(Pinned in Task 1 unit test + Task 2/3 components.)_
2. **Nominatim Outage / Empty Geocode Results:** `GET /api/spots/geocode` fails open with `[]` on 5s timeout or offline CI. Step 1 of `SubmitSpotDialog` must let users pick an Indonesian city preset or adjust pin/coordinates directly without being blocked. _(Pinned in Task 3 + Task 5 E2E.)_
3. **XSS & Malicious URL Schemes:** `javascript:`, `data:`, non-Maps Google domains (e.g. `https://docs.google.com/...`), and `http://maps.google.com/...` must be rejected by `createSpotSubmissionSchema`/`googleMapsUrlSchema` before submission and sanitized on render; review text renders as plain text only. _(Pinned in Task 1 unit test + Task 2/3.)_
4. **Coordinate Clamping & Non-WebGL Fallback:** Coordinates outside `INDONESIA_BBOX` (`lat [-11.5, 6.5]`, `lng [94.5, 141.5]`) must be clamped/rejected with clear Indonesian feedback; missing WebGL context must render usable coordinate & preset controls instead of a blank box. _(Pinned in Task 1 unit test + Task 3.)_
5. **Cross-Query Cache Coherency (Admin ↔ Public Map & Bookmarks ↔ Kontribusi Saya):** Moderating a spot in `/admin` must invalidate both `adminKeys.all` (sidebar badge counts) and `spotKeys.all` (public `/spots` list/cities); bookmarking or submitting a spot must invalidate `spotKeys.mine()`; review upsert/delete must invalidate `spotKeys.detail(slug)`, `spotKeys.reviews(slug)`, and `spotKeys.lists()`. _(Pinned in Task 1/4 hooks + Task 5 E2E.)_

---

## File Map

**Modify:**

- `apps/web/src/styles/globals.css` — Add native `dialog:modal` & `dialog::backdrop` scroll containment rules.
- `apps/web/src/features/spots/types.ts` — Re-export review, report, geocode, nearby-check, submission, and my-activity DTOs/input types from `@starter/shared`.
- `apps/web/src/features/spots/spots-helpers.ts` — Add vibe tag labels, report reason labels, submission status metadata, rating distribution percentage helper, `clampIndonesiaCoordinate`, `buildSpotSubmissionPayload`, and `formatSpotApiError`.
- `apps/web/src/features/spots/api.ts` — Add endpoints for reviews, geocode, nearby-check, submit spot, my activity, and reports.
- `apps/web/src/features/spots/queries.ts` — Add query keys & `queryOptions` for reviews and my activity.
- `apps/web/src/features/spots/hooks.ts` — Add review, submission, geocode, nearby-check, report, and my-activity hooks; invalidate `spotKeys.mine()` on bookmark toggle.
- `apps/web/src/features/spots/components/spot-detail-panel.tsx` — Support `/api/media/...` cover URLs via `isUsableAssetUrl`, `safeSocialHref` for Instagram, clean bookmark error via `formatSpotApiError`.
- `apps/web/src/features/spots/components/spots-explorer-view.tsx` — Wire `"+ Usulkan Sudut Baca"`, `"Kontribusi Saya"`, empty-state submission CTA, `SpotReviewsSection`, `ReportSpotDialog`, `SubmitSpotDialog`, and `MySpotsDrawer`.
- `apps/web/src/routes/_protected/spots.tsx` — Pass `currentUserId={user.id}` into `SpotsExplorerView`.
- `apps/web/src/features/admin/api.ts`, `queries.ts`, `hooks.ts` — Add `GET /api/admin/spots` and `PATCH /api/admin/spots/:id/moderate` client/hooks.
- `apps/web/src/routes/_protected/admin.tsx` — Add `"spots"` to `adminSearchSchema` and permission check.
- `apps/web/src/features/admin/components/admin-sidebar.tsx` — Add `"Sudut Baca"` tab with live badge `pendingSpotsCount + openSpotReportsCount`.
- `apps/web/src/features/admin/components/admin-cms-dashboard.tsx` — Mount `<AdminSpotsTab />`, include spot pending/report counts in header pill & sidebar, add `"Sudut Baca"` mobile nav tab safely.
- `apps/api/src/test/spots-ui-helpers.test.ts` — Add unit tests for #23 pure helpers, payload builders, error formatting, and validation rules.

**Create:**

- `apps/web/src/features/spots/components/spot-modal-dialog.tsx` — Reusable native `<dialog>` modal & drawer shell.
- `apps/web/src/features/spots/components/report-spot-dialog.tsx` — Spot info correction & review abuse report dialog.
- `apps/web/src/features/spots/components/spot-reviews-section.tsx` — Aggregate rating, star distribution, vibe tags, review form/edit/delete, and paginated review list.
- `apps/web/src/features/spots/components/spot-pin-picker-map.tsx` — Lazy MapLibre pin picker + non-WebGL coordinate/preset fallback.
- `apps/web/src/features/spots/components/submit-spot-dialog.tsx` — 3-step community spot submission wizard (Locate/Pin -> 100m Duplicate Guard -> Comfort Form -> Outcome).
- `apps/web/src/features/spots/components/my-spots-drawer.tsx` — `"Kontribusi & Favorit Saya"` drawer (`GET /api/spots/mine`).
- `apps/web/src/features/admin/components/admin-spots-tab.tsx` — Admin CMS moderation queue & edit/approve/reject/close/resolve-reports tooling.
- `e2e/reading-spots.spec.ts` — Full vertical Playwright E2E test suite.

---

### Task 1: Spots Client Data Layer & Pure UI Helpers (TDD)

**Files:**

- Modify: `apps/web/src/features/spots/types.ts`
- Modify: `apps/web/src/features/spots/spots-helpers.ts`
- Modify: `apps/web/src/features/spots/api.ts`
- Modify: `apps/web/src/features/spots/queries.ts`
- Modify: `apps/web/src/features/spots/hooks.ts`
- Test: `apps/api/src/test/spots-ui-helpers.test.ts`

**Interfaces:**

- Consumes: `@starter/shared/validators/spots` (`createSpotSubmissionSchema`, `upsertSpotReviewSchema`, `createSpotReportSchema`, `spotReviewTagValues`, `spotReportReasonValues`, `INDONESIA_BBOX`), `@starter/shared/types` (`ReadingSpotReviewDto`, `ReadingSpotReportDto`, `SpotNearbyMatchDto`, `SpotGeocodeResultDto`, `ReadingSpotDetailDto`, `ReadingSpotSummaryDto`).
- Produces:
  - Helpers in `spots-helpers.ts`:
    - `SPOT_REVIEW_TAG_LABELS: Record<SpotReviewTag, string>`
    - `SPOT_REPORT_REASON_LABELS: Record<SpotReportReason, string>`
    - `SPOT_STATUS_META: Record<SpotStatus, { label: string; tone: "pending" | "published" | "rejected" | "closed" }>`
    - `SPOT_PRICE_RANGE_OPTIONS`, `SPOT_NOISE_LEVEL_OPTIONS`
    - `clampIndonesiaCoordinate(lat: number, lng: number): { lat: number; lng: number; wasClamped: boolean }`
    - `toggleVibeTagSelection(current: readonly SpotReviewTag[], tag: SpotReviewTag, maxTags?: number): SpotReviewTag[]`
    - `calculateRatingPercent(count: number, total: number): number`
    - `formatSpotApiError(error: unknown, fallback?: string): string`
    - `buildSpotSubmissionPayload(form: SpotSubmissionFormDraft): CreateSpotSubmissionInput`
  - API functions in `api.ts`:
    - `listSpotReviews(slug: string, params?: { limit?: number; offset?: number }, signal?: AbortSignal): Promise<SpotReviewsResponseDto>`
    - `upsertMySpotReview(slug: string, input: UpsertSpotReviewInput): Promise<UpsertSpotReviewResponseDto>`
    - `deleteMySpotReview(slug: string): Promise<{ deleted: boolean; ratingAvg: number; ratingCount: number }>`
    - `geocodeSpotLocation(q: string, signal?: AbortSignal): Promise<SpotGeocodeResultDto[]>`
    - `checkNearbyDuplicateSpots(params: NearbyCheckQueryInput, signal?: AbortSignal): Promise<SpotNearbyMatchDto[]>`
    - `submitReadingSpot(input: CreateSpotSubmissionInput): Promise<ReadingSpotDetailDto>`
    - `listMySpotActivity(signal?: AbortSignal): Promise<MySpotActivityDto>`
    - `reportSpotOrReview(slug: string, input: CreateSpotReportInput): Promise<{ report: ReadingSpotReportDto; openUniqueReporterCount: number }>`
  - Query keys & hooks in `queries.ts` / `hooks.ts`:
    - `spotKeys.reviews(slug, params?)`, `spotKeys.mine()`
    - `useSpotReviews(slug, params?)`, `useUpsertSpotReview(slug)`, `useDeleteSpotReview(slug)`, `useGeocodeSpot()`, `useNearbySpotCheck(params, enabled)`, `useSubmitReadingSpot()`, `useMySpotActivity(enabled?)`, `useReportSpot(slug)`

- [ ] **Step 1: Write failing unit tests in `apps/api/src/test/spots-ui-helpers.test.ts`**

Add a `describe("Issue #23 reviews, submission & moderation helpers", ...)` block testing:

1. `SPOT_REVIEW_TAG_LABELS` covers all 7 `spotReviewTagValues` with exact Indonesian labels (`Colokan banyak`, `Wi-Fi stabil`, `Tenang untuk fokus`, `Banyak koleksi buku`, `Kopi/minuman enak`, `Gratis masuk`, `Nyaman berlama-lama`).
2. `toggleVibeTagSelection` adds up to 3 unique tags, ignores a 4th tag when already at 3, and removes an active tag when clicked again.
3. `clampIndonesiaCoordinate` keeps Jakarta (`-6.2, 106.8`) unchanged (`wasClamped: false`) and clamps out-of-bounds Singapore/Tokyo coordinates (`35.6, 139.7`) inside `INDONESIA_BBOX` (`wasClamped: true`).
4. `formatSpotApiError` extracts Indonesian field message from `ApiError` with `details`, surfaces `429` rate-limit message, surfaces `409` duplicate report message, and falls back safely on unknown errors.
5. `buildSpotSubmissionPayload` trims whitespace, strips empty optional strings (`googleMapsUrl`, `websiteUrl`, `instagramHandle`, `openingHoursText`, `district`, `description`), normalizes `@handle`, and produces an object accepted by `createSpotSubmissionSchema.safeParse(...)`; verifies `javascript:alert(1)` or `https://docs.google.com/maps` fails `createSpotSubmissionSchema`.

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `pnpm --filter @starter/api exec vitest run src/test/spots-ui-helpers.test.ts`
Expected: FAIL because new helpers are not exported from `spots-helpers.ts`.

- [ ] **Step 3: Implement shared type re-exports & helpers (`types.ts`, `spots-helpers.ts`)**

- Export `SpotReviewsResponseDto`, `UpsertSpotReviewResponseDto`, `MySpotActivityDto`, `SpotSubmissionFormDraft`, and re-export `@starter/shared` spot types in `apps/web/src/features/spots/types.ts`.
- Implement all helper constants and functions in `apps/web/src/features/spots/spots-helpers.ts` cleanly using `INDONESIA_BBOX` from `@starter/shared/validators/spots`.

- [ ] **Step 4: Implement API client, query options, and TanStack Query hooks (`api.ts`, `queries.ts`, `hooks.ts`)**

- Add all 8 API functions in `apps/web/src/features/spots/api.ts`, encoding `slug` via `encodeURIComponent` and propagating `ApiError` on non-2xx responses (never swallowing 400/409/429).
- Add `spotKeys.reviews(slug, params)` and `spotKeys.mine()` + `spotReviewsQuery` and `mySpotsActivityQuery` in `queries.ts`.
- Add mutation hooks in `hooks.ts` with strict cache invalidation:
  - `useUpsertSpotReview` / `useDeleteSpotReview` -> invalidate `spotKeys.detail(slug)`, `spotKeys.reviews(slug)`, `spotKeys.lists()`.
  - `useSubmitReadingSpot` -> invalidate `spotKeys.mine()`, `spotKeys.lists()`, `spotKeys.cities()`.
  - `useToggleSpotBookmark` -> also invalidate `spotKeys.mine()` in `onSettled`.
  - `useReportSpot` -> return server response cleanly without mutating spot list prematurely.

- [ ] **Step 5: Run unit tests & typecheck (GREEN)**

Run: `pnpm --filter @starter/api exec vitest run src/test/spots-ui-helpers.test.ts && pnpm typecheck`
Expected: PASS (all assertions green, 0 TS errors).

- [ ] **Step 6: Commit Task 1**

```bash
git add apps/web/src/features/spots/{types.ts,spots-helpers.ts,api.ts,queries.ts,hooks.ts} apps/api/src/test/spots-ui-helpers.test.ts
git commit -m "feat(spots): add review, submission, report, and my-activity client hooks (#23)"
```

---

### Task 2: Accessible Native Dialog Shell, `SpotReviewsSection` & `ReportSpotDialog`

**Files:**

- Modify: `apps/web/src/styles/globals.css`
- Create: `apps/web/src/features/spots/components/spot-modal-dialog.tsx`
- Create: `apps/web/src/features/spots/components/report-spot-dialog.tsx`
- Create: `apps/web/src/features/spots/components/spot-reviews-section.tsx`
- Modify: `apps/web/src/features/spots/components/spot-detail-panel.tsx`

**Interfaces:**

- Consumes: Task 1 hooks (`useSpotReviews`, `useUpsertSpotReview`, `useDeleteSpotReview`, `useReportSpot`) and helpers (`SPOT_REVIEW_TAG_LABELS`, `SPOT_REPORT_REASON_LABELS`, `toggleVibeTagSelection`, `calculateRatingPercent`, `formatSpotApiError`).
- Produces:
  - `SpotModalDialog({ open, onClose, title, description, variant?: "modal" | "drawer", dismissMode?: "any" | "closerequest", maxWidthClass?, children })`
  - `ReportSpotDialog({ open, onClose, spotSlug, spotName, reviewTarget?: { id: string; authorName: string } | null })`
  - `SpotReviewsSection({ spotSlug, spotName, currentUserId, initialMyReview?, onReportReview })`

- [ ] **Step 1: Add native `<dialog>` scroll-containment CSS in `apps/web/src/styles/globals.css`**

Add top-level rules:

```css
dialog:modal {
  overscroll-behavior: contain;
}

dialog::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
}
```

Do NOT mutate `html`/`body` overflow or `position: fixed`.

- [ ] **Step 2: Create `SpotModalDialog` in `apps/web/src/features/spots/components/spot-modal-dialog.tsx`**

- Renders native `<dialog ref={dialogRef} data-lenis-prevent aria-labelledby={titleId} aria-describedby={descId}>` opened via `showModal()` and closed via `close()` when `open` toggles.
- Never adds redundant `role="dialog"` or `aria-modal` (native modal already provides them).
- Sets `closedby={dismissMode}` (cast cleanly for React 19 TS) AND includes the pointer-bounds `pointerdown`/`pointerup` light-dismiss fallback when `dismissMode === "any"` and `!('closedBy' in HTMLDialogElement.prototype)` (Safari compatibility).
- Syncs browser `close` event (e.g. `Esc` press) back to `onClose()` and resets `dialog.returnValue = ""`.
- Supports `variant="modal"` (centered Furrow card `max-w-xl`/`max-w-2xl`, `max-h-[90dvh]`) and `variant="drawer"` (right-aligned full-height sheet `max-w-md w-full`).
- Sticky header with `<h1>` title (`font-serif`), optional description, and `44x44px` close `<button type="button" aria-label="Tutup dialog">`.

- [ ] **Step 3: Create `ReportSpotDialog` in `apps/web/src/features/spots/components/report-spot-dialog.tsx`**

- Wraps `SpotModalDialog` (`dismissMode="any"`).
- When `reviewTarget` is provided: locks `reasonType` to `"review_abuse"`, displays which reviewer's comment is being reported, and sends `reviewId: reviewTarget.id`.
- When `reviewTarget` is null: exposes 5 visible radio options (`permanently_closed`, `wrong_location`, `wrong_info`, `duplicate`, `spam`) inside `<fieldset><legend>` (per `modern-web-guidance` selection matrix: 2–5 exclusive options -> visible radios, `>= 44px` tap area).
- `<textarea>` for `details` (`5..1000` chars) validated via `createSpotReportSchema` on blur/submit (`aria-invalid`, `aria-describedby`).
- Handles `409 DUPLICATE_OPEN_REPORT` and `429 RATE_LIMIT_EXCEEDED` via `formatSpotApiError` in a `role="alert"` box; displays confirmation banner on 201 success.

- [ ] **Step 4: Create `SpotReviewsSection` in `apps/web/src/features/spots/components/spot-reviews-section.tsx`**

- Fetches `useSpotReviews(spotSlug, { limit: 10, offset })` and accumulates paginated pages cleanly when user clicks `"Muat ulasan lainnya"` (`hasMore`).
- **Summary Block:** Large average score (`font-mono tabular-nums`), star icon, total review count, 5→1 horizontal breakdown bars (`calculateRatingPercent`), and top vibe-tag badges with counts (`tagCounts`).
- **My Review / Composer Block:**
  - Resolves existing user review from `initialMyReview` OR `reviews.find((r) => r.userId === currentUserId)`.
  - When user already has a review and is not editing: shows highlighted `"Ulasan Anda"` card with `"Edit Ulasan"` and `"Hapus"` buttons (`min-h-11`). Clicking `"Hapus"` reveals an inline confirmation strip (with `"Batal"` focused first / positioned so existing controls don't shift under the pointer!) before invoking `useDeleteSpotReview`.
  - Composer / Edit `<form>`:
    - Accessible integer star selector (`1..5`): `<fieldset><legend>Beri rating (1–5 bintang)</legend>` with 5 `<input type="radio" className="sr-only">` + `>= 44x44px` `<label>` buttons showing filled/outlined stars + accessible label (`"1 bintang"` .. `"5 bintang"`).
    - Optional Reading Vibe Tags (`spotReviewTagValues`): multi-select toggle buttons (`aria-pressed`, `min-h-11`, counter `X/3`), capped at 3 via `toggleVibeTagSelection`.
    - `<textarea>` (`10..1500` chars) with live character count, validated with `upsertSpotReviewSchema` on blur/submit (never interrupting while typing, clearing error on input).
    - Submit button (`"Kirim Ulasan"` / `"Simpan Perubahan"`) disables only while `isPending`; errors render via `formatSpotApiError` in `role="alert"`.
- **Community Reviews List:**
  - Renders each review as plain text (`<p className="whitespace-pre-line break-words">`), author name/avatar initials, star rating (`tabular-nums`), vibe tag pills, formatted Indonesian date (`Intl.DateTimeFormat("id-ID")`), and `"Laporkan ulasan"` button (`min-h-11`) for reviews where `review.userId !== currentUserId`.

- [ ] **Step 5: Harmonize `SpotDetailPanel` (`apps/web/src/features/spots/components/spot-detail-panel.tsx`)**

- Replace `sanitizeExternalHttpUrl(spot.coverUrl)` with `isUsableAssetUrl(spot.coverUrl)` (`@/lib/media-url`) so uploaded `/api/media/...` cover photos approved by admins render cleanly.
- Use `safeSocialHref(spot.instagramHandle, "instagram")` (`@/lib/safe-url`) for Instagram link.
- Replace pre-#20 bookmark 404 stub message with `formatSpotApiError(err, "Gagal memperbarui simpanan sudut baca.")`.
- Upgrade 12px accent links to `text-[var(--color-accent-text)]` for WCAG AA contrast on Manila Paper.

- [ ] **Step 6: Verify lint, typecheck, and build**

Run: `pnpm exec eslint apps/web/src/features/spots && pnpm typecheck`
Expected: PASS (0 errors).

- [ ] **Step 7: Commit Task 2**

```bash
git add apps/web/src/styles/globals.css apps/web/src/features/spots/components/{spot-modal-dialog.tsx,report-spot-dialog.tsx,spot-reviews-section.tsx,spot-detail-panel.tsx}
git commit -m "feat(spots): add native dialog shell, spot reviews UI, and report dialog (#23)"
```

---

### Task 3: Community Submission Flow (`SpotPinPickerMap`, `SubmitSpotDialog`, `MySpotsDrawer`) & `/spots` Wiring

**Files:**

- Create: `apps/web/src/features/spots/components/spot-pin-picker-map.tsx`
- Create: `apps/web/src/features/spots/components/submit-spot-dialog.tsx`
- Create: `apps/web/src/features/spots/components/my-spots-drawer.tsx`
- Modify: `apps/web/src/features/spots/components/spots-explorer-view.tsx`
- Modify: `apps/web/src/routes/_protected/spots.tsx`

**Interfaces:**

- Consumes: Task 1 hooks (`useGeocodeSpot`, `useNearbySpotCheck`, `useSubmitReadingSpot`, `useMySpotActivity`, `useToggleSpotBookmark`), Task 2 (`SpotModalDialog`, `SpotReviewsSection`, `ReportSpotDialog`).
- Produces:
  - `SpotPinPickerMap({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void })`
  - `SubmitSpotDialog({ open, onClose, defaultCity?, defaultCenter?, onOpenExistingSpot, onOpenMyContributions })`
  - `MySpotsDrawer({ open, onClose, onSelectSpot, onOpenSubmitDialog })`

- [ ] **Step 1: Create `SpotPinPickerMap` in `apps/web/src/features/spots/components/spot-pin-picker-map.tsx`**

- Checks WebGL availability (`canvas.getContext("webgl2") || canvas.getContext("webgl")`).
- **WebGL mode:** Dynamically imports `maplibre-gl`, worker URL (`maplibre-gl/dist/maplibre-gl-worker.mjs?url`), and CSS; constrains bounds to `INDONESIA_BBOX`; places a draggable Furrow-accent `maplibregl.Marker({ draggable: true })`; clicking anywhere on map or dragging marker calls `clampIndonesiaCoordinate(lat, lng)` -> `onChange(lat, lng)`. Syncs light/dark theme and respects `prefers-reduced-motion` (`jumpTo` vs `flyTo`). Wraps container with `data-lenis-prevent`.
- **Fallback / Precision Controls (always accessible below map, and primary UI when WebGL unavailable):** Shows Indonesia city quick-jump buttons (`INDONESIA_CITY_PRESETS.slice(0, 6)`) and numeric `Lintang (Latitude)` / `Bujur (Longitude)` inputs (`font-mono tabular-nums`, clamped via `clampIndonesiaCoordinate`) so keyboard-only users and headless CI browsers can set exact coordinates cleanly.

- [ ] **Step 2: Create `SubmitSpotDialog` in `apps/web/src/features/spots/components/submit-spot-dialog.tsx`**

- Wraps `SpotModalDialog` with `dismissMode={isDirty ? "closerequest" : "any"}` so users don't accidentally lose form progress by clicking the backdrop.
- Accessible 3-step progress indicator (`<nav aria-label="Langkah pengusulan"><ol>` with `aria-current="step"`), moving focus to the step heading (`tabIndex={-1}`) on step transitions, and preserving all draft values when navigating Back/Next.
- **Step 1 — Lokasi & Pin:**
  - Search form wired to `useGeocodeSpot()` (`GET /api/spots/geocode?q=`, min 2 chars). Displays loading state, empty/offline guidance (`"Hasil pencarian tidak ditemukan? Pilih kota preset atau geser pin langsung di peta."`), and clickable geocode result cards that auto-fill `address`, `district`, `city`, `province`, `lat`, `lng`.
  - Embeds `<SpotPinPickerMap lat={draft.latitude} lng={draft.longitude} onChange={...} />`.
  - Optional pre-input for spot name (`name`) so Step 2's nearby duplicate check can also score fuzzy name similarity.
- **Step 2 — Cek Duplikat (Radius 100 m):**
  - Triggers `useNearbySpotCheck({ lat: draft.latitude, lng: draft.longitude, name: draft.name || undefined, radiusMeters: 100 }, step === 2)`.
  - If `matches.length > 0`: renders warning banner `"Apakah maksudmu [Nama Spot] ([X] m dari titik ini)? Buka spot & tulis ulasan saja."` with per-match button `"Buka Spot & Tulis Ulasan"` (closes modal & calls `onOpenExistingSpot(match.slug)`) + explicit checkbox/confirmation `"Bukan, ini tempat berbeda — lanjutkan pengusulan"` required before `"Lanjut ke Detail"` enables.
  - If `matches.length === 0`: displays green confirmation `"Tidak ditemukan sudut baca serupa dalam radius 100 m."` and enables `"Lanjut ke Detail"`.
- **Step 3 — Detail Kenyamanan Baca:**
  - Single-column accessible `<form>` matching `createSpotSubmissionSchema`:
    - `name` (required, 2–180 chars)
    - `category` (5 visible radio buttons inside `<fieldset><legend>` for zero-click scanning)
    - `city` (required), `province` (required), `district` (optional)
    - `address` (`<textarea autocomplete="street-address">`, required 5–500 chars)
    - `openingHoursText` (optional, e.g. `"Sen–Min 09.00–21.00"`)
    - `priceRange` (4 visible radios: Gratis / Terjangkau / Menengah / Premium)
    - `noiseLevel` (3 visible radios: Tenang / Sedang / Ramai)
    - `facilities` (8 checkboxes inside `<fieldset><legend>Fasilitas Kenyamanan Baca</legend>`)
    - `googleMapsUrl` (optional, `autocorrect="off" autoCapitalize="none" spellCheck={false}`, validated client-side via `googleMapsUrlSchema` with clear Indonesian hint)
    - `instagramHandle` (optional), `websiteUrl` (optional)
    - `description` (`<textarea>`, optional up to 2000 chars)
  - Validates via `createSpotSubmissionSchema.safeParse(buildSpotSubmissionPayload(draft))` on submit, moves focus to first invalid field, and surfaces API errors (`429 RATE_LIMIT_EXCEEDED`, `400`) via `formatSpotApiError`.
- **Step 4 (Outcome View inside dialog):**
  - If `created.status === "published"`: `"Sudut baca langsung tayang!"` + button `"Lihat di Peta"` (`onOpenExistingSpot(created.slug)`).
  - If `created.status === "pending_review"`: `"Usulan diterima — sedang ditinjau tim kurasi"` + button `"Lihat di Kontribusi Saya"` (`onOpenMyContributions()`).

- [ ] **Step 3: Create `MySpotsDrawer` in `apps/web/src/features/spots/components/my-spots-drawer.tsx`**

- Wraps `SpotModalDialog` (`variant="drawer"`, `dismissMode="any"`), backed by `useMySpotActivity(open)`.
- Accessible two-tab switcher (`role="tablist"`):
  - **Usulan Saya (`submissions.length`)**: Lists user's submitted spots with `SPOT_STATUS_META` badges (`Menunggu Kurasi`, `Tayang`, `Ditolak`, `Tutup`), city/category, `rejectionReason` callout when `status === "rejected"`, `"Buka di Peta"` button when `status === "published"`, and empty state with `"+ Usulkan Sudut Baca"` CTA.
  - **Favorit Tersimpan (`bookmarks.length`)**: Lists bookmarked spots with category/rating, `"Buka di Peta"` button (`onSelectSpot(spot.slug)`), and `"Hapus Simpanan"` button wired to `useToggleSpotBookmark()`.

- [ ] **Step 4: Wire all #23 interactions into `SpotsExplorerView` and `/spots` route**

- `apps/web/src/routes/_protected/spots.tsx`: pass `currentUserId={user.id}` to `<SpotsExplorerView />`.
- `apps/web/src/features/spots/components/spots-explorer-view.tsx`:
  - Add action row in desktop sidebar header AND mobile top bar / sheet header with:
    - `"+ Usulkan Sudut Baca"` primary/accent-outline button (`min-h-11`) -> opens `SubmitSpotDialog`.
    - `"Kontribusi Saya"` button (`min-h-11`) -> opens `MySpotsDrawer`.
  - Update `SpotListBody` empty state to include concrete CTA: `"Belum ada sudut baca di kota ini? Usulkan tempat pertamamu"` -> opens `SubmitSpotDialog` pre-centered on selected city.
  - Pass `reportActionSlot` (`"Laporkan / Koreksi"` button opening `ReportSpotDialog`) and `reviewsSlot` (`<SpotReviewsSection spotSlug={activeSpot.slug} spotName={activeSpot.name} currentUserId={currentUserId} initialMyReview={detailSpot?.myReview} onReportReview={(review) => setReportTarget({ spot: activeSpot, review })} />`) to `SpotDetailPanel` in BOTH desktop sidebar and mobile bottom sheet!
  - Mount `<SubmitSpotDialog />`, `<MySpotsDrawer />`, and `<ReportSpotDialog />` once at the root of `SpotsExplorerView`.

- [ ] **Step 5: Verify lint, typecheck, and build**

Run: `pnpm exec eslint apps/web/src/features/spots apps/web/src/routes/_protected/spots.tsx && pnpm typecheck && pnpm --filter @starter/web build`
Expected: PASS (0 errors).

- [ ] **Step 6: Commit Task 3**

```bash
git add apps/web/src/features/spots/components/{spot-pin-picker-map.tsx,submit-spot-dialog.tsx,my-spots-drawer.tsx,spots-explorer-view.tsx} apps/web/src/routes/_protected/spots.tsx
git commit -m "feat(spots): add community spot submission flow, duplicate guard, and my contributions drawer (#23)"
```

---

### Task 4: Admin CMS Moderation Tab ("Sudut Baca") in `/admin`

**Files:**

- Modify: `apps/web/src/features/admin/api.ts`
- Modify: `apps/web/src/features/admin/queries.ts`
- Modify: `apps/web/src/features/admin/hooks.ts`
- Create: `apps/web/src/features/admin/components/admin-spots-tab.tsx`
- Modify: `apps/web/src/routes/_protected/admin.tsx`
- Modify: `apps/web/src/features/admin/components/admin-sidebar.tsx`
- Modify: `apps/web/src/features/admin/components/admin-cms-dashboard.tsx`

**Interfaces:**

- Consumes: `GET /api/admin/spots`, `PATCH /api/admin/spots/:id/moderate`, `GET /api/admin/overview` (`pendingSpotsCount`, `openSpotReportsCount`), `moderateSpotSchema` (`@starter/shared/validators/spots`), `AdminSpotModerationItemDto` (`@starter/shared/types`), `spotKeys` (`@/features/spots/queries`).
- Produces:
  - `getAdminSpots(params?, signal?)`, `moderateAdminSpot(id, input)` in `admin/api.ts`
  - `adminKeys.spots(params?)`, `adminSpotsQuery(params?)` in `admin/queries.ts`
  - `useAdminSpots(params?)`, `useModerateAdminSpot()` in `admin/hooks.ts`
  - `AdminSpotsTab` component mounted at `/admin?tab=spots`

- [ ] **Step 1: Extend Admin API client, queries, and hooks (`api.ts`, `queries.ts`, `hooks.ts`)**

- Add `getAdminSpots(params?: ListAdminSpotsQueryInput, signal?: AbortSignal): Promise<AdminSpotModerationItemDto[]>` calling `GET /api/admin/spots`.
- Add `moderateAdminSpot(id: string, input: ModerateSpotInput): Promise<AdminSpotModerationItemDto>` calling `PATCH /api/admin/spots/${encodeURIComponent(id)}/moderate`.
- Add `adminKeys.spots(params)` and `adminSpotsQuery(params)`.
- Add `useAdminSpots(params)` and `useModerateAdminSpot()` whose `onSettled` invalidates BOTH `adminKeys.all` AND `spotKeys.all`.

- [ ] **Step 2: Create `AdminSpotsTab` in `apps/web/src/features/admin/components/admin-spots-tab.tsx`**

- **Tabular Summary Metrics Row:** Pending Kurasi (`pendingSpotsCount`), Laporan Terbuka (`openSpotReportsCount`), Total Hasil Filter (`spots.length`) in `Red Hat Mono tabular-nums`.
- **Filter Tabs + Search:**
  - Filter presets matching Issue #23 AC:
    - `Menunggu Kurasi` (`{ status: "pending_review" }`) — default active view
    - `Laporan Terbuka` (`{ hasOpenReports: true }`)
    - `Tayang` (`{ status: "published" }`)
    - `Tutup / Ditolak` (`status: "rejected"` + `status: "closed"` toggle, or two clear pills `Ditolak` & `Tutup`)
  - Search input (`q`) + `"Muat Ulang"` button.
- **Moderation Queue Cards & Inspection/Edit Panel:**
  - Each item displays: spot name, category badge, status badge, verified badge (`none` / `curated` / `partner`), city & full address, submitter name/email + submitted date, open reports badge (`openReportsCount`), and external Google Maps verification link (`buildGoogleMapsDirectionsUrl(spot)` + `buildGoogleMapsPlaceUrl(spot)` with `target="_blank" rel="noopener noreferrer"`).
  - **Expandable Quick-Edit & Report Inspection Drawer/Panel (per selected spot):**
    - Allows admin to fix minor typos & adjust `name`, `category`, `address`, `district`, `city`, `province`, `openingHoursText`, `priceRange`, `noiseLevel`, `verifiedBadge` (`none` / `curated` / `partner`), `googleMapsUrl`, and `description` before approving/saving.
    - Lists `recentReports` (reason badge from `SPOT_REPORT_REASON_LABELS`, reporter name, plain-text details, timestamp, open/resolved badge).
  - **Moderation Actions (all `>= 44px`, validated via `moderateSpotSchema`):**
    - `Setujui & Tayangkan` (`action: "approve"`, passes any edited fields/badge).
    - `Tolak` (`action: "reject"` — reveals required `rejectionReason` textarea `>= 5` chars before confirming).
    - `Selesaikan Laporan (Tetap Tayang)` (shown when `status === "published" && openReportsCount > 0`; sends `action: "approve"` + any edited fields, atomically resolving open reports).
    - `Tandai Tutup` (`action: "mark_closed"` — optional note).
    - `Buka Kembali` (`action: "reopen"` — for `closed` spots).
  - Inline feedback banner (`role="status"` / `role="alert"`) using `formatSpotApiError`.

- [ ] **Step 3: Wire `"spots"` tab into `/admin` route, `AdminSidebar`, and `AdminCmsDashboard`**

- `apps/web/src/routes/_protected/admin.tsx`:
  - Add `"spots"` to `adminSearchSchema` enum.
  - Check `roleHasPermission(userRole, { spots: ["manage-any"] })` alongside `isAdmin` / `canReadNotes`.
- `apps/web/src/features/admin/components/admin-sidebar.tsx`:
  - Add `"spots"` to `AdminTab` union.
  - Add `spots?: number` to `pendingCounts`.
  - Add `{ id: "spots", label: "Sudut Baca", icon: MapPin, badge: pendingCounts.spots ?? 0 }` right after `"calendars"`.
- `apps/web/src/features/admin/components/admin-cms-dashboard.tsx`:
  - Compute `pendingSpots = (overview?.pendingSpotsCount ?? 0) + (overview?.openSpotReportsCount ?? 0)` and include it in `totalPending` and `AdminSidebar`'s `pendingCounts.spots`.
  - Add `spots: "Kurasi Sudut Baca"` to `tabTitles`.
  - Render `{activeTab === "spots" && <AdminSpotsTab overview={overview} />}`.
  - Add `"Sudut Baca"` button (`MapPin` icon + badge dot when `pendingSpots > 0`) in mobile bottom nav bar, adding `overflow-x-auto scrollbar-none` so 7 items never cause horizontal document overflow at `390px`.

- [ ] **Step 4: Verify lint, typecheck, and build**

Run: `pnpm exec eslint apps/web/src/features/admin apps/web/src/routes/_protected/admin.tsx && pnpm typecheck && pnpm build`
Expected: PASS (0 errors).

- [ ] **Step 5: Commit Task 4**

```bash
git add apps/web/src/features/admin/{api.ts,queries.ts,hooks.ts} apps/web/src/features/admin/components/{admin-spots-tab.tsx,admin-sidebar.tsx,admin-cms-dashboard.tsx} apps/web/src/routes/_protected/admin.tsx
git commit -m "feat(admin): add Sudut Baca moderation tab with live pending/report badges (#23)"
```

---

### Task 5: Playwright E2E Suite (`e2e/reading-spots.spec.ts`) & Full Verification Gate

**Files:**

- Create: `e2e/reading-spots.spec.ts`

**Interfaces:**

- Consumes: `e2e/helpers.ts` (`API_URL`, `WEB_URL`, `headers`, `signUp`, `setRole`, `fitsWidth`), seeded `reading_spots` automatically populated by `apps/api/src/migrate.ts` -> `seedCatalog` -> `seedSpots`.

- [ ] **Step 1: Write `e2e/reading-spots.spec.ts` covering the full vertical lifecycle**

Design deterministic, zero-external-network-dependency Playwright tests:

1. **Home Banner -> Fullscreen Map -> Filter -> Google Maps Deep Link -> Review Lifecycle (Create, Reload, Edit, Delete) + Report Spot:**
   - Sign up regular user via `signUp(page.request, "Pembaca Peta")`.
   - Visit `/app?tab=home` at `1280x800`; verify `HomeSpotsBanner` shows seeded Indonesian spots; click `"Buka Peta Sudut Baca"` CTA -> verify URL navigates to `/spots` inside `AppShell` and `fitsWidth(page) === true`.
   - Filter by category (e.g. `"Toko Buku Indie"`) or city (`"Jakarta"`), click a seeded spot in the list -> verify `SpotDetailPanel` opens and `"Buka di Google Maps"` `href` matches `/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+(\.\d+)?,-?\d+(\.\d+)?/`.
   - Inside `SpotReviewsSection`: select 5 stars, toggle 2 vibe tags (`"Colokan banyak"`, `"Tenang untuk fokus"`), fill review text (`>= 20` chars), submit -> verify review and updated rating appear.
   - `await page.reload()` -> verify persisted review & rating count remain intact.
   - Click `"Edit Ulasan"` -> change to 4 stars + updated text -> save -> verify updated text & rating.
   - Click `"Hapus"` -> confirm deletion -> verify review is removed and composer returns.
   - Click `"Laporkan / Koreksi"` -> submit `"wrong_info"` report -> verify success confirmation.
2. **Community Submission (`+ Usulkan Sudut Baca`) -> Duplicate Check -> `pending_review` in Kontribusi Saya -> Admin Approve on `/admin?tab=spots` -> Public Visibility on `/spots`:**
   - Intercept `**/api/spots/geocode*` via `page.route` returning a deterministic Indonesia geocode result (e.g. `"Kafe Literasi Uji"`, Bandung `-6.9147, 107.6098`) so CI never flakes on external Nominatim.
   - Click `"+ Usulkan Sudut Baca"` -> search & select location in Step 1 -> proceed to Step 2 (verify nearby-check runs cleanly) -> complete Step 3 with unique spot name (`Sudut Baca Uji ${suffix}`), valid category, address, facilities, and valid Google Maps URL -> submit -> verify `"Usulan diterima — sedang ditinjau tim kurasi"`.
   - Open `"Kontribusi Saya"` drawer -> verify newly submitted spot appears with `"Menunggu Kurasi"` badge.
   - Open second browser context for Admin (`signUp` + `setRole(adminEmail, "admin")`) -> navigate to `/admin?tab=spots` -> verify pending badge & submitted spot card -> click `"Setujui & Tayangkan"` -> verify status transitions to `"Tayang"`.
   - In regular user context -> navigate to `/spots?q=Sudut+Baca+Uji+${suffix}` -> confirm newly approved spot is publicly visible on `/spots`!
3. **Mobile Responsive Guard (`390x844`):**
   - Verify `/spots`, opening `SubmitSpotDialog`, and `/admin?tab=spots` maintain `fitsWidth(page) === true` (zero horizontal overflow).

- [ ] **Step 2: Run targeted E2E test first, then full verification suite**

Run:

```bash
pnpm exec eslint apps packages e2e \
  && pnpm exec prettier --check apps packages e2e \
  && pnpm typecheck \
  && pnpm test \
  && pnpm build \
  && pnpm test:e2e
```

Expected: ALL commands exit `0` — ESLint 0 errors, Prettier clean, Typecheck 0 errors, Vitest 100% pass, Build pass, Playwright `e2e/reading-spots.spec.ts` + entire E2E suite 100% pass.

- [ ] **Step 3: Commit Task 5, push branch, and open PR (`Closes #23`)**

```bash
git add e2e/reading-spots.spec.ts
git commit -m "test(e2e): add vertical reading spots review, submission, and admin moderation suite (#23)"
git push -u origin feat/23-reading-spots-reviews-moderation
```

Open PR with `Closes #23`, watch all GitHub Actions CI checks (`lint-typecheck-build`, `unit-test`, `security-scan`, `e2e`), and report evidence to the founder.
