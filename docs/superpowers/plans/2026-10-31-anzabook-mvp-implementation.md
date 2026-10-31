# AnzaBook MVP & Kinetic Literary UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the end-to-end AnzaBook web application combining a Malaka Books-inspired kinetic literary landing experience (GSAP + Lenis smooth scroll, Opening Literary Curtain Preloader, 3D Tactile Shelf Book Carousel), Multi-Format & Tiered Paper Book Catalog with Live Gramedia/Store Stock Tracking, Protected Bilingual & Audiobook Web Reader with Pre-Trigger DRM, Strava-Style "Flex Your Literacy" Share Studio, and Publisher HPP Calculator.

**Architecture:** Full-stack TypeScript monorepo (`apps/api` on Express 5 + Drizzle ORM + PostgreSQL + Better Auth, `apps/web` on TanStack Start + TanStack Query + Tailwind CSS v4 + shadcn/ui + GSAP + Lenis, and `packages/shared` for strict Zod contracts, permissions, and print economics math). Public exploration routes render with SSR data prefetching and kinetic GSAP/Lenis choreography, while authenticated reader and studio routes enforce session ownership, anti-piracy pre-trigger shielding, and zero-distraction reading ergonomics.

**Tech Stack:** TypeScript, Express 5, PostgreSQL 17, Drizzle ORM, Better Auth, TanStack Start (React 19, TanStack Router, TanStack Query), Tailwind CSS v4 (OKLCH Furrow tokens), GSAP (`gsap` + `ScrollTrigger`), Lenis (`lenis`), HTML5 Canvas, Vitest, Supertest, Playwright.

**Spec:** `PRD_AnzaBook.md`, `docs/superpowers/specs/2026-10-31-anzabook-design-system.md`, `DESIGN.md`

## Global Constraints

- **Color Architecture (OKLCH Furrow):** Route all colors through CSS variables (`--color-paper: oklch(96% 0.011 85)`, `--color-ink: oklch(18% 0.006 60)`, `--color-accent: oklch(70% 0.19 40)` with dark ink foreground `--color-accent-ink: oklch(18% 0.006 60)`). Never use white text on `--color-accent`, blue-to-purple gradients, or neon glows.
- **Typography Cap (Dual-Zone Literary System):** Use `Literata` (`--font-display` / `--font-reader`), `Plus Jakarta Sans` (`--font-body`), and `Red Hat Mono` (`--font-outlier` with `tabular-nums`). Maximum 3 font weights across the app: `400`, `500`, `600` (never `700`/`800`/`900`).
- **Tactile Radius & Elevation:** Use concentric radii (`--radius-xs: 4px`, `--radius-pill: 6px` for buttons/inputs, `--radius-card: 10px`, `--radius-entry: 14px`, `--radius-book: 3px 8px 8px 3px`). Never make buttons, inputs, and cards all pill-shaped (`9999px`).
- **Motion & Accessibility Floor (R-19, R-32, R-39):** Use `Lenis` + `GSAP` on exploration pages (`MOTION 3`), automatically stop `Lenis` and all looping animations inside the Reading Canvas (`MOTION 1`), provide a visible Pause/Play button on the Hero Book Carousel, provide a Skip (`Lewati`) button on the Opening Preloader, and disable non-essential motion under `@media (prefers-reduced-motion: reduce)`.
- **Copywriting Hygiene (R-02, R-15, R-16):** Never use the em dash character in UI copy or documentation prose. Use concrete Indonesian action labels (`Buka Katalog Buku`, `Baca Intisari 20 Menit`, `Cek Stok Cabang`, `Unduh Stiker Strava PNG`) and avoid AI marketing buzzwords.
- **Security & Ownership Boundaries:** Authenticate mutations with `requireAuth` and `requireTrustedOrigin`. Filter user-owned records (`reading_sessions`, `user_shelves`) by the verified session user ID in SQL; reject unknown or injected `userId` fields in Zod schemas with HTTP 422.

## Review Focus

1. **Print-Claim-Only Digital Policy Enforcement:** Requesting full chapters (`mode=full`, `chapterNumber > 1`) on a book with `digitalPolicy = "print_claim_only"` or `"sample_only"` without a verified print claim or active membership must return `403 FORBIDDEN_DIGITAL_ACCESS` while still permitting Chapter 1 sample and 20-minute Intisari blueprint preview.
2. **Invalid or Already-Claimed Physical Book Code:** Submitting a non-existent or already-redeemed physical book claim code to `POST /api/books/:slug/claim-code` must return `422 INVALID_CLAIM_CODE` or `409 CLAIM_CODE_ALREADY_USED` without unlocking the book.
3. **Reading Telemetry Bounds & WPM Sanity:** Submitting a reading session (`POST /api/reading-sessions`) with `durationSeconds <= 0`, `pagesRead <= 0`, `avgWpm > 1200`, or an injected `userId` must be rejected with `422 VALIDATION_ERROR` by the strict shared Zod schema.
4. **Cross-Account Shelf & Session Isolation:** A signed-in user querying `/api/shelves` or `/api/reading-sessions` must never see another user's shelves, reading streak, or session history, and attempting to update another user's shelf item must return `404 NOT_FOUND`.
5. **Reduced Motion & Reader Canvas Scroll Isolation:** When `@media (prefers-reduced-motion: reduce)` is active or when navigating to `/read/$slug`, the Opening Preloader must not trap the screen, the Hero Carousel must be paused/controllable, and `Lenis` smooth scrolling must be stopped so native reader pagination and keyboard shortcuts (`ArrowRight`, `ArrowLeft`, `b`, `t`, `Escape`) work deterministically.

---

### Task 1: Environment Setup, Site Identity, Furrow Design System Tokens & Motion Dependencies (`gsap` + `lenis`)

**Files:**
- Modify: `starter.config.json`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/routes/__root.tsx`
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/components/brand.tsx`
- Modify: `apps/web/src/components/ui/button.tsx`

**Interfaces:**
- Consumes: `apps/web/public/icon.svg`, `docs/superpowers/specs/2026-10-31-anzabook-design-system.md`
- Produces:
  - Updated `siteConfig` (`name: "AnzaBook"`, `description: "Platform baca digital dwibahasa, buku cetak Edisi Rakyat terjangkau, dan komunitas literasi Indonesia."`)
  - Installed `gsap` and `lenis` in `@starter/web`
  - CSS custom properties and utility classes in `apps/web/src/styles/globals.css`: `.btn-moulded`, `.btn-moulded-secondary`, `.ruled-index`, `.notebook-card`, `.book-cover-3d`, `.reader-prose`, plus theme selectors `[data-theme="sepia"]` and `.dark, [data-theme="night"]`
  - `<Brand />` rendering `/icon.svg` monogram + `Literata 600` wordmark

- [ ] **Step 1: Prepare local environment and install `gsap` and `lenis` in `@starter/web`**

Run:
```powershell
pnpm dev:prepare
pnpm --filter @starter/web add gsap lenis
```
Expected: PostgreSQL container is healthy, migrations apply, and `gsap` + `lenis` are added to `apps/web/package.json`.

- [ ] **Step 2: Update `starter.config.json` and `apps/web/src/routes/__root.tsx` with AnzaBook identity and Google Fonts**

Update `starter.config.json` so `name` is `"AnzaBook"` and `description` is `"Platform baca digital dwibahasa, buku cetak Edisi Rakyat terjangkau, dan komunitas literasi Indonesia."`.
In `apps/web/src/routes/__root.tsx`, set `<html lang="id">`, update the page title format to `${siteConfig.name} : Pustaka Digital & Edisi Rakyat`, and add `<link>` tags in `head()` for Google Fonts (`Literata:ital,opsz,wght@0,7..72,400..600;1,7..72,400`, `Plus+Jakarta+Sans:wght@400;500;600`, `Red+Hat+Mono:wght@400;500`, `Atkinson+Hyperlegible:ital,wght@0,400;1,400`).

- [ ] **Step 3: Implement Hallmark Furrow OKLCH tokens and utility classes in `apps/web/src/styles/globals.css`**

Replace the starter hex variables in `apps/web/src/styles/globals.css` with the exact OKLCH token tables from `docs/superpowers/specs/2026-10-31-anzabook-design-system.md` (Sections 4, 5, 6, 7, 8, 9), including:
- `:root` Furrow Manila palette, `[data-theme="sepia"]`, and `.dark, [data-theme="night"]`
- Font families `--font-display`, `--font-reader`, `--font-body`, `--font-outlier`, `--font-reader-sans`, `--font-reader-accessible`
- Radius tokens `--radius-xs: 4px`, `--radius-pill: 6px`, `--radius-card: 10px`, `--radius-entry: 14px`, `--radius-book: 3px 8px 8px 3px`
- Surface classes `.btn-moulded`, `.ruled-index`, `.notebook-card`, `.book-cover-3d`, `.reader-prose`
- `html, body { overflow-x: clip; }` and `@media (prefers-reduced-motion: reduce)` overrides (`animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;`).

- [ ] **Step 4: Update `apps/web/src/components/brand.tsx` and `apps/web/src/components/ui/button.tsx`**

Update `Brand` in `apps/web/src/components/brand.tsx` to render `<img src="/icon.svg" alt="" width={32} height={32} className="size-8 rounded-[8px]" />` alongside `AnzaBook` in `font-serif font-semibold tracking-tight` and a subtle tag `Pustaka & Cetak Rakyat`.
Update `buttonVariants` in `apps/web/src/components/ui/button.tsx` so `rounded-[6px]`, `font-medium`, minimum touch height `h-11` (`44px`) on default buttons, and tactile press `active:translate-y-[1px]` match Section 8.2 of the Design System spec.

- [ ] **Step 5: Run typecheck and lint to verify Task 1**

Run: `pnpm run typecheck && pnpm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit Task 1**

```powershell
git add starter.config.json pnpm-lock.yaml apps/web/package.json apps/web/src/routes/__root.tsx apps/web/src/styles/globals.css apps/web/src/components/brand.tsx apps/web/src/components/ui/button.tsx DESIGN.md docs/superpowers/specs/2026-10-31-anzabook-design-system.md
git commit -m "feat(design): configure AnzaBook identity, Furrow OKLCH tokens, and GSAP/Lenis dependencies"
```

---

### Task 2: Shared Contracts, Permissions & Print HPP Calculator Engine (`packages/shared`)

**Files:**
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/src/permissions.ts`
- Create: `packages/shared/src/validators/books.ts`
- Create: `packages/shared/src/validators/reading.ts`
- Create: `packages/shared/src/validators/community.ts`
- Create: `packages/shared/src/validators/publisher.ts`
- Create: `packages/shared/src/print-economics.ts`
- Modify: `packages/shared/src/types/api.ts`
- Create: `apps/api/src/test/print-economics.test.ts`

**Interfaces:**
- Consumes: `zod`
- Produces:
  - Subpath exports in `packages/shared/package.json`: `"./validators/books"`, `"./validators/reading"`, `"./validators/community"`, `"./validators/publisher"`, `"./print-economics"`
  - `calculatePrintEconomics(input: SimulatePrintInput): PrintEconomicsResult` in `packages/shared/src/print-economics.ts`
  - Strict Zod schemas:
    - `listBooksQuerySchema`, `bookSlugSchema`, `readBookQuerySchema`, `stockQuerySchema`, `claimPrintCodeSchema`
    - `createReadingSessionSchema` (validating `pagesRead: 1..1000`, `durationSeconds: 10..28800`, `avgWpm: 30..1200`, `mode: "full" | "blueprint" | "audio"`)
    - `upsertShelfSchema`, `createReviewSchema` (`rating: 0.5..5.0` in `0.5` steps), `createParagraphCommentSchema`
    - `simulatePrintSchema` (`pageCount: 24..1200`, `printRun: 100..50000`, `authorRoyaltyPct: 5..25`)
  - DTO types in `packages/shared/src/types/api.ts`: `BookSummaryDto`, `BookDetailDto`, `BookPrintEditionDto`, `StoreStockItemDto`, `BookReaderPayloadDto`, `ReadingSessionDto`, `ReadingTelemetrySummaryDto`, `ShelfItemDto`, `BookReviewDto`, `ParagraphCommentDto`, `PrintEconomicsResult`

- [ ] **Step 1: Write the failing unit test for Print HPP Economics & Shared Validators in `apps/api/src/test/print-economics.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import { createReadingSessionSchema } from "@starter/shared/validators/reading";

describe("AnzaBook Print Economics & Shared Validators", () => {
  it("calculates Edisi Rakyat (Newsprint 48.8gsm) at >45% lower retail price than traditional bookstore distribution", () => {
    const result = calculatePrintEconomics({
      pageCount: 240,
      printRun: 3000,
      authorRoyaltyPct: 12,
    });
    const rakyat = result.tiers.find((t) => t.editionTier === "rakyat_economy");
    const standard = result.tiers.find((t) => t.editionTier === "standard_trade");
    expect(rakyat).toBeDefined();
    expect(standard).toBeDefined();
    expect(rakyat!.recommendedPriceIdr).toBeGreaterThanOrEqual(25000);
    expect(rakyat!.recommendedPriceIdr).toBeLessThanOrEqual(49000);
    expect(rakyat!.recommendedPriceIdr).toBeLessThan(
      standard!.traditionalRetailPriceIdr * 0.55,
    );
  });

  it("rejects out-of-range WPM or injected userId on reading sessions", () => {
    expect(
      createReadingSessionSchema.safeParse({
        bookId: "550e8400-e29b-41d4-a716-446655440000",
        pagesRead: 12,
        durationSeconds: 900,
        avgWpm: 1850,
        mode: "full",
      }).success,
    ).toBe(false);

    expect(
      createReadingSessionSchema.safeParse({
        bookId: "550e8400-e29b-41d4-a716-446655440000",
        pagesRead: 12,
        durationSeconds: 900,
        avgWpm: 240,
        mode: "full",
        userId: "injected-owner",
      }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @starter/api test -- src/test/print-economics.test.ts`
Expected: FAIL with module resolution error for `@starter/shared/print-economics`.

- [ ] **Step 3: Implement validators, DTOs, permissions, and `calculatePrintEconomics` in `packages/shared`**

Implement:
- `packages/shared/src/print-economics.ts` computing HPP (paper cost per page by GSM `48.8` newsprint vs `72` bookpaper vs `80` hardcover + fixed plate offset cost amortized over `printRun` + direct-to-reader distribution vs 45% retail cut).
- `packages/shared/src/validators/books.ts`, `reading.ts`, `community.ts`, `publisher.ts` using `.strict()` on every object schema so unknown fields and `userId` are rejected.
- `packages/shared/src/types/api.ts` and `packages/shared/package.json` exports.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @starter/api test -- src/test/print-economics.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit Task 2**

```powershell
git add packages/shared apps/api/src/test/print-economics.test.ts
git commit -m "feat(shared): add AnzaBook validators, DTOs, and Indian-model print HPP calculator"
```

---

### Task 3: PostgreSQL Schema, Migrations & Literary Seed Data (`apps/api/src/db`)

**Files:**
- Create: `apps/api/src/db/schema/anzabook.ts`
- Modify: `apps/api/src/db/schema/index.ts`
- Create: `apps/api/src/services/seed.service.ts`
- Create: `apps/api/drizzle/<generated_migration>.sql`

**Interfaces:**
- Consumes: `apps/api/src/db/schema/user.ts`, `drizzle-orm/pg-core`
- Produces:
  - Drizzle tables: `books`, `bookChapters`, `bookPrintEditions`, `bookClaimCodes`, `storeBranches`, `storeInventories`, `readingSessions`, `userShelves`, `bookReviews`, `paragraphComments`
  - `ensureSeededCatalog(): Promise<void>` in `apps/api/src/services/seed.service.ts`

- [ ] **Step 1: Define Drizzle schema in `apps/api/src/db/schema/anzabook.ts` and export from `index.ts`**

Create `apps/api/src/db/schema/anzabook.ts` with PostgreSQL `pgTable` definitions matching Section 4 of `PRD_AnzaBook.md`:
- `books`: `id` (uuid PK), `slug` (varchar unique), `title`, `subtitle`, `authorName`, `category`, `synopsis`, `coverColor` (OKLCH/hex accent for 3D spine), `pageCount`, `readingMinutes`, `isWeeklyBulletin` (boolean), `digitalPolicy` (`"full_saas" | "sample_only" | "print_claim_only"`), `securityLevel` (`"standard_blur" | "strict_touch_focus"`), `createdAt`
- `bookChapters`: `id` (uuid PK), `bookId` (FK `books.id`), `chapterNumber` (integer), `isBlueprintSummary` (boolean for 20-Minute Intisari mode), `titleId`, `titleEn`, `paragraphsJson` (JSONB array of `{ index, textId, textEn, audioStartSec, audioEndSec }`), `audioDurationSec` (integer)
- `bookPrintEditions`: `id` (uuid PK), `bookId` (FK `books.id`), `isbn` (varchar unique), `editionTier` (`"rakyat_economy" | "standard_trade" | "collector_hardcover"`), `label`, `paperType`, `paperGsm` (real), `coverType`, `priceIdr` (integer), `traditionalPriceIdr` (integer), `weightGrams` (integer), `notes`
- `bookClaimCodes`: `id` (uuid PK), `bookId` (FK `books.id`), `code` (varchar unique), `claimedByUserId` (text nullable FK `user.id`), `claimedAt` (timestamp nullable)
- `storeBranches`: `id` (uuid PK), `chainName` (`"Gramedia" | "AnzaWarehouse" | "MitraIndie"`), `branchName`, `city`, `address`, `mapUrl`, `distanceKm` (real)
- `storeInventories`: `id` (uuid PK), `branchId` (FK `storeBranches.id`), `editionId` (FK `bookPrintEditions.id`), `stockCount` (integer), `stockStatus` (`"available" | "low_stock" | "out_of_stock"`), `lastSyncedAt` (timestamp)
- `readingSessions`: `id` (uuid PK), `userId` (FK `user.id`), `bookId` (FK `books.id`), `pagesRead` (integer), `durationSeconds` (integer), `avgWpm` (integer), `mode` (varchar), `createdAt` (timestamp)
- `userShelves`: `id` (uuid PK), `userId` (FK `user.id`), `bookId` (FK `books.id`), `shelfStatus` (`"want_to_read" | "currently_reading" | "read" | "dnf"`), `progressPct` (integer), `lastChapter` (integer), `isBookmarked` (boolean), `updatedAt` (timestamp)
- `bookReviews`: `id` (uuid PK), `userId` (FK `user.id`), `bookId` (FK `books.id`), `ratingHalfSteps` (integer `1..10` representing `0.5..5.0`), `content` (text), `isVerifiedReader` (boolean), `createdAt` (timestamp)
- `paragraphComments`: `id` (uuid PK), `userId` (FK `user.id`), `bookId` (FK `books.id`), `chapterNumber` (integer), `paragraphIndex` (integer), `content` (text), `hasSpoiler` (boolean), `createdAt` (timestamp)

- [ ] **Step 2: Generate and apply Drizzle migration**

Run:
```powershell
pnpm db:generate
pnpm db:migrate
```
Expected: SQL migration generated in `apps/api/drizzle/` and applied cleanly to PostgreSQL.

- [ ] **Step 3: Implement idempotent catalog seeder in `apps/api/src/services/seed.service.ts`**

Seed 6 curated books spanning Philosophy, Economics of Literacy, Science, Cognitive Psychology, and Indonesian Literature (including a Weekly Bulletin featured book, full + 20-minute Intisari bilingual `ID`/`EN` chapters with audio timestamps, 3 physical print editions per book starting at Rp29.000 *Edisi Rakyat*, valid physical claim codes like `ANZA-RAKYAT-2026`, and 6 `storeBranches` across Gramedia Matraman, Gramedia Grand Indonesia, Gramedia Merdeka Bandung, Gramedia Sudirman Yogyakarta, Gudang Pusat AnzaBook Jakarta, and Kineruku / Kolektif Indie).

- [ ] **Step 4: Run `pnpm run typecheck` to verify schema types**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add apps/api/src/db/schema apps/api/drizzle apps/api/src/services/seed.service.ts
git commit -m "feat(db): add AnzaBook schema migrations and curated multi-format catalog seed"
```

---

### Task 4: Express API Services, Routes & Integration Tests (`apps/api`)

**Files:**
- Create: `apps/api/src/services/books.service.ts`
- Create: `apps/api/src/services/reading.service.ts`
- Create: `apps/api/src/services/community.service.ts`
- Create: `apps/api/src/routes/books.routes.ts`
- Create: `apps/api/src/routes/reading.routes.ts`
- Create: `apps/api/src/routes/community.routes.ts`
- Create: `apps/api/src/routes/publisher.routes.ts`
- Modify: `apps/api/src/routes/index.ts`
- Create: `apps/api/src/test/anzabook.test.ts`

**Interfaces:**
- Consumes: `apps/api/src/db`, `apps/api/src/services/seed.service.ts`, `@starter/shared/validators/*`, `@starter/shared/print-economics`
- Produces:
  - `GET /api/books` (public catalog with filter by `category`, `search`, `editionTier`, plus Weekly Bulletin)
  - `GET /api/books/:slug` (public detail with print editions, sample chapter info, rating summary)
  - `GET /api/books/:slug/stock?city=` (public live store & Gramedia stock tracker by edition and city)
  - `GET /api/books/:slug/read?mode=full|blueprint&chapter=1` (`requireAuth`: returns obfuscated/chunked bilingual paragraphs, audio sync timestamps, and DRM watermark token `userEmail + sessionShortId`; enforces `digitalPolicy` windowing)
  - `POST /api/books/:slug/claim-code` (`requireAuth`, `requireTrustedOrigin`, `jsonBody`: redeems physical book code, marks user as verified owner, unlocks full digital access)
  - `GET /api/reading-sessions` & `POST /api/reading-sessions` (`requireAuth`, `requireTrustedOrigin`: logs session, computes streak & 7-day telemetry for Strava Share Studio)
  - `GET /api/shelves` & `PUT /api/shelves` (`requireAuth`, `requireTrustedOrigin`: manages user's smart shelves & reading progress, auto-granting Verified Reader when `progressPct >= 70`)
  - `GET /api/books/:slug/reviews` & `POST /api/books/:slug/reviews`
  - `GET /api/books/:slug/comments` & `POST /api/books/:slug/comments` (inline paragraph marginalia)
  - `POST /api/publisher/simulate` (public/studio HPP calculator endpoint wrapping `calculatePrintEconomics`)

- [ ] **Step 1: Write the failing API integration tests in `apps/api/src/test/anzabook.test.ts`**

Cover all 5 Review Focus items and core flows:
1. Public catalog (`GET /api/books`), book detail (`GET /api/books/:slug`), and live Gramedia/warehouse stock filter (`GET /api/books/:slug/stock?city=Jakarta`).
2. `print_claim_only` digital policy blocking Chapter 2 (`403 FORBIDDEN_DIGITAL_ACCESS`) while allowing 20-minute `blueprint` mode and Chapter 1 sample; then unlocking Chapter 2 after redeeming a valid code via `POST /api/books/:slug/claim-code` (and rejecting invalid/reused codes with `422`/`409`).
3. Reading telemetry logging (`POST /api/reading-sessions`), 7-day summary calculation (`GET /api/reading-sessions`), and validation rejection (`422`) on invalid WPM or injected `userId`.
4. Cross-account shelf isolation (`GET /api/shelves`, `PUT /api/shelves`) and automatic `isVerifiedReader: true` badge on `POST /api/books/:slug/reviews` when shelf `progressPct >= 70` or print code was claimed.
5. Inline paragraph marginalia (`POST /api/books/:slug/comments`) with `hasSpoiler` flag and origin header enforcement (`403 FORBIDDEN_ORIGIN`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @starter/api test -- src/test/anzabook.test.ts`
Expected: FAIL with `404` on `/api/books`.

- [ ] **Step 3: Implement services and routes in `apps/api/src/services/` and `apps/api/src/routes/`**

Implement `books.service.ts`, `reading.service.ts`, `community.service.ts` and mount `booksRouter`, `readingRouter`, `communityRouter`, and `publisherRouter` in `apps/api/src/routes/index.ts`.

- [ ] **Step 4: Run the API integration test suite to verify it passes**

Run: `pnpm --filter @starter/api test`
Expected: PASS (all existing `notes`, `admin`, `health` tests + new `print-economics` and `anzabook` tests pass).

- [ ] **Step 5: Commit Task 4**

```powershell
git add apps/api/src/services apps/api/src/routes apps/api/src/test/anzabook.test.ts
git commit -m "feat(api): implement books, live stock, protected reader, telemetry, and community APIs"
```

---

### Task 5: Smooth Scroll (`Lenis` + `GSAP`), Opening Literary Curtain Preloader & 3D Tactile Shelf Landing Page (`apps/web`)

**Files:**
- Create: `apps/web/src/features/books/api.ts`
- Create: `apps/web/src/features/books/queries.ts`
- Create: `apps/web/src/features/books/hooks.ts`
- Create: `apps/web/src/components/motion/lenis-gsap-provider.tsx`
- Create: `apps/web/src/components/motion/anza-preloader.tsx`
- Create: `apps/web/src/components/motion/single-letter-roll.tsx`
- Create: `apps/web/src/components/motion/hero-book-stage.tsx`
- Create: `apps/web/src/components/site-header.tsx`
- Modify: `apps/web/src/components/providers.tsx`
- Modify: `apps/web/src/routes/index.tsx`

**Interfaces:**
- Consumes: `gsap`, `gsap/ScrollTrigger`, `lenis`, `/api/books`, `/icon.svg`
- Produces:
  - `LenisGsapProvider` exposing `useSmoothScroll()` (`{ velocity, isPaused, pauseScroll, resumeScroll }`) and automatically disabling Lenis on `/read/$slug` or `prefers-reduced-motion: reduce`
  - `AnzaPreloader`: Malaka Books-inspired 3-stage literary quote blur-to-sharp animation on `--color-ink` with `/icon.svg`, `sessionStorage` guard (`anzabook-preloader-v1`), `"Lewati"` button (`aria-label="Lewati prapemuat"` + `Escape` key listener), and curved SVG bottom path exit (`y: "-100dvh"`)
  - `SingleLetterRoll`: Staggered character-roll text animation (`transitionDelay: index * 6.7ms`, `--ease-roll`) for primary interactive CTAs
  - `HeroBookStage`: 3D Tactile Shelf & Depth-Tilt Book Carousel on a Furrow Drafting Ledge. Unlike Malaka's flat marquee, books sit on an arched 3D perspective shelf reactive to Lenis scroll velocity; hovering or keyboard-focusing a book pulls it out (`translate3d(0, -16px, 24px) rotateY(-10deg)`) to reveal an index card with **Edisi Rakyat price (`Rp29.000+`)**, **Live Stock badge**, and **"Baca Intisari"** link. Includes an explicit **Jeda Rak / Putar Rak** button (`data-testid="carousel-pause-toggle"`) for R-39 compliance.
  - Public & Signed-in Landing Page at `apps/web/src/routes/index.tsx`:
    1. **Editorial Hero + `HeroBookStage` 3D Shelf** (visible at `1280x800` without scrolling: headline, core sentence, and primary CTA `"Buka Katalog Buku"`).
    2. **Buletin Mingguan (Weekly Bulletin)**: Editorial highlight of the week's featured book with one-tap share and `"Baca Intisari 20 Menit"`.
    3. **Eksplorasi Katalog & Filter Kategori**: Searchable, category-filterable book grid using Furrow `Book Shelf Card` (`--radius-book`) and `Ruled Index` metadata.
    4. **Revolusi Harga Kertas (Adaptasi Model India ke Indonesia)**: Interactive comparison table showing why *Edisi Rakyat (Newsprint 48.8 gsm, Rp29.000)* cuts 60% off traditional retail prices, plus SaaS Membership Tiers (`3 Bulan Rp60.000`, `6 Bulan Rp108.000`, `12 Bulan Rp192.000`).
    5. **FAQ Spesifik Produk (R-28)**: Real questions about Edisi Rakyat paper quality, physical book Claim Codes, Pre-Trigger Web DRM, and Gramedia store pickup.

- [ ] **Step 1: Create `apps/web/src/features/books/{api,queries,hooks}.ts`**

Implement isomorphic `apiFetch` wrappers and TanStack Query `queryOptions` + custom hooks for `booksQuery`, `bookDetailQuery`, `bookStockQuery`, `bookReaderQuery`, and `claimBookCodeMutation`.

- [ ] **Step 2: Implement `LenisGsapProvider`, `AnzaPreloader`, `SingleLetterRoll`, and `HeroBookStage` in `apps/web/src/components/motion/`**

Ensure:
- `AnzaPreloader` checks `window.matchMedia("(prefers-reduced-motion: reduce)")` and `sessionStorage.getItem("anzabook-preloader-v1")`. Clicking `"Lewati"` (`data-testid="skip-preloader"`) or pressing `Escape` immediately dismisses the curtain and records the session key.
- `HeroBookStage` renders the 3D Furrow shelf ledge, book covers with spine crease shading, interactive pull-out inspection card, and a Pause/Play button (`data-testid="carousel-pause-toggle"`).
- `LenisGsapProvider` disables smooth scroll when `location.pathname.startsWith("/read/")` so the Reading Canvas remains 100% native and distraction-free.

- [ ] **Step 3: Build `SiteHeader` and replace the root redirect in `apps/web/src/routes/index.tsx` with the full AnzaBook Landing & Catalog page**

Instead of immediately redirecting anonymous visitors to `/sign-in` on `/`, `apps/web/src/routes/index.tsx` loads the catalog via `context.queryClient.ensureQueryData(booksQuery({}))` in `loader` and renders the complete AnzaBook experience with real navigation anchors (`#eksplorasi`, `#edisi-rakyat`, `#keanggotaan`, `#faq`) and links to `/books/$slug`, `/app`, `/sign-in`, and `/sign-up`.

- [ ] **Step 4: Run `pnpm run typecheck` and `pnpm run lint` to verify Task 5**

Run: `pnpm run typecheck && pnpm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit Task 5**

```powershell
git add apps/web/src/features/books apps/web/src/components/motion apps/web/src/components/site-header.tsx apps/web/src/components/providers.tsx apps/web/src/routes/index.tsx
git commit -m "feat(web): add GSAP/Lenis smooth scroll, Malaka-inspired preloader, and 3D shelf hero landing page"
```

---

### Task 6: Book Detail Page, Tiered Paper 3D Switcher & Live Gramedia/Store Stock Tracker (`apps/web`)

**Files:**
- Create: `apps/web/src/routes/books.$slug.tsx`
- Create: `apps/web/src/features/books/components/paper-tier-selector.tsx`
- Create: `apps/web/src/features/books/components/live-stock-tracker.tsx`
- Create: `apps/web/src/features/books/components/claim-code-dialog.tsx`
- Create: `apps/web/src/features/community/api.ts`
- Create: `apps/web/src/features/community/queries.ts`
- Create: `apps/web/src/features/community/hooks.ts`

**Interfaces:**
- Consumes: `bookDetailQuery(slug)`, `bookStockQuery(slug, city)`, `reviewsQuery(slug)`, `useUpsertShelf()`, `useClaimBookCode()`, `useCreateReview()`
- Produces:
  - Route `/books/$slug` (`apps/web/src/routes/books.$slug.tsx`) with SSR `loader` prefetching book detail, live stock, and reviews
  - `PaperTierSelector`: Interactive 4-option selector (`1. Digital SaaS`, `2. Edisi Rakyat Newsprint 48.8 gsm`, `3. Edisi Standar Bookpaper 72 gsm`, `4. Edisi Kolektor Hardcover`) that updates a tactile 3D book preview (changing paper edge tint, spine width, weight in grams, and savings breakdown in `Red Hat Mono`)
  - `LiveStockTracker`: City filter (`Semua Kota`, `Jakarta`, `Bandung`, `Yogyakarta`, `Surabaya`) displaying real-time stock status (`Tersedia`, `Stok Menipis`, `Habis`) across `Gramedia`, `Gudang Pusat AnzaBook`, and `Mitra Indie` in a Furrow `Ruled Index` table with store pickup reservation feedback
  - `ClaimCodeDialog`: Modal dialog allowing buyers of physical books to enter their unique code (e.g. `ANZA-RAKYAT-2026`) to unlock full digital reading and earn the **Verified Reader** badge
  - Verified Reader Reviews section with `0.5`-step decimal rating selector (`0.5` to `5.0`) and empty/loading/error states (R-27)

- [ ] **Step 1: Implement `apps/web/src/features/community/{api,queries,hooks}.ts`**

Create API calls and hooks for `shelves`, `reviews`, `paragraphComments`, `readingSessions`, and `publisherSimulate`.

- [ ] **Step 2: Build `PaperTierSelector`, `LiveStockTracker`, and `ClaimCodeDialog` in `apps/web/src/features/books/components/`**

Ensure every interactive control has `cursor: pointer`, visible `:focus-visible`, `44x44px` minimum tap targets, and complete empty/loading/error states.

- [ ] **Step 3: Build route `apps/web/src/routes/books.$slug.tsx`**

Connect the loader, 3D book preview, `PaperTierSelector`, action buttons (`"Baca Sekarang"`, `"Baca Intisari 20 Menit"`, `"Simpan ke Rak"`, `"Klaim Kode Buku Cetak"`), `LiveStockTracker`, and Verified Reader Reviews.

- [ ] **Step 4: Run `pnpm run typecheck` and `pnpm run lint`**

Run: `pnpm run typecheck && pnpm run lint`
Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```powershell
git add apps/web/src/features/community apps/web/src/features/books/components apps/web/src/routes/books.\$slug.tsx
git commit -m "feat(web): add book detail page with 3D paper tier switcher and live Gramedia stock tracker"
```

---

### Task 7: Protected Web Reader (`Full` vs `20-Min Intisari`, Bilingual Split View, Audiobook Sync & Pre-Trigger Web DRM) (`apps/web`)

**Files:**
- Create: `apps/web/src/routes/_protected/read.$slug.tsx`
- Create: `apps/web/src/features/reader/components/drm-shield.tsx`
- Create: `apps/web/src/features/reader/components/reader-toolbar.tsx`
- Create: `apps/web/src/features/reader/components/audiobook-bar.tsx`
- Create: `apps/web/src/features/reader/components/marginalia-drawer.tsx`

**Interfaces:**
- Consumes: `bookReaderQuery(slug, mode, chapter)`, `paragraphCommentsQuery(slug, chapter)`, `useCreateReadingSession()`, `useUpsertShelf()`, `useCreateParagraphComment()`
- Produces:
  - Route `/_protected/read/$slug` (`apps/web/src/routes/_protected/read.$slug.tsx`)
  - `DrmShield` (`apps/web/src/features/reader/components/drm-shield.tsx`):
    - Blocks `copy`, `cut`, `contextmenu`, and `Ctrl+P` / `Cmd+P` inside the reading canvas (`user-select: none`)
    - Instant `<16ms` state transition to `isShieldActive = true` (`filter: blur(18px)` on prose + high-contrast Watermark Overlay showing `/icon.svg`, reader's email, session ID, and copyright notice) when:
      1. Modifier keys (`Meta`, `Shift`, `Alt`, `PrintScreen`) are pressed on `keydown`/`keyup`
      2. Window loses focus (`window.onblur` or `document.visibilityState === "hidden"`)
      3. Multi-touch gesture (`touchstart` with `e.touches.length >= 2`) is detected on mobile
      4. Optional **Mode Sorot / Hold-to-Read Spotlight** (`strict_touch_focus`) is toggled on and the pointer/finger leaves the reading area
    - Exposes a button `"Lanjutkan Membaca"` (`data-testid="drm-resume-btn"`) or automatic focus recovery to clear the shield once safe
  - `ReaderToolbar`:
    - Mode switch: **Buku Penuh (Full Book)** vs **Intisari 20 Menit (Blueprint)**
    - Language switch: **Indonesia (`ID`)**, **English (`EN`)**, or **Bilingual Split View (`ID + EN` berdampingan per paragraf)**
    - `Aa` Appearance Popover: Font family (`Literata`, `Plus Jakarta Sans`, `Atkinson Hyperlegible`), 5 font size steps (`15px` to `24px`), line-height (`1.5`, `1.7`, `1.9`), and real-time paper theme (`Manila`, `Sepia`, `Malam`)
    - Bookmark ribbon toggle (`b` shortcut) and TOC Sheet drawer (`t` shortcut)
  - `AudiobookBar`: Synchronized audio player with Web Speech / synthesized audio cadence engine, playback speed (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`), play/pause, and automatic active paragraph highlight sync
  - `MarginaliaDrawer`: Inline per-paragraph community discussion with spoiler shield toggle (`Sembunyikan Spoiler`)
  - **Finish Reading Session Action (`"Selesai Sesi & Bagikan ke Strava Literasi"`)**: Records telemetry (`pagesRead`, `durationSeconds`, `avgWpm`) via `useCreateReadingSession()` and navigates to `/app?tab=share&sessionId=...`

- [ ] **Step 1: Build `DrmShield`, `ReaderToolbar`, `AudiobookBar`, and `MarginaliaDrawer` in `apps/web/src/features/reader/components/`**

Ensure keyboard shortcuts (`ArrowRight`, `ArrowLeft`, `b`, `t`, `Escape`) work when focus is not inside an input/textarea, and that zero looping animations exist inside the reading canvas.

- [ ] **Step 2: Build route `apps/web/src/routes/_protected/read.$slug.tsx`**

Connect the reader query, handle `FORBIDDEN_DIGITAL_ACCESS` gracefully by offering a one-click switch to **Intisari 20 Menit** or opening the **Klaim Kode Buku Cetak** dialog, and wire session telemetry recording.

- [ ] **Step 3: Run `pnpm run typecheck` and `pnpm run lint`**

Run: `pnpm run typecheck && pnpm run lint`
Expected: PASS.

- [ ] **Step 4: Commit Task 7**

```powershell
git add apps/web/src/features/reader apps/web/src/routes/_protected/read.\$slug.tsx
git commit -m "feat(reader): implement bilingual split-view reader, audiobook sync, marginalia, and pre-trigger web DRM"
```

---

### Task 8: Signed-In Workspace (`/app`): Smart Shelves, Strava-Style "Flex Your Literacy" Share Studio & Publisher HPP Studio (`apps/web`)

**Files:**
- Create: `apps/web/src/features/share-studio/canvas-renderer.ts`
- Create: `apps/web/src/features/share-studio/share-studio-panel.tsx`
- Create: `apps/web/src/features/publisher/publisher-studio-panel.tsx`
- Modify: `apps/web/src/routes/_protected.tsx`
- Modify: `apps/web/src/routes/_protected/app.tsx`
- Delete: `e2e/starter.spec.ts`

**Interfaces:**
- Consumes: `shelvesQuery`, `readingSessionsQuery`, `booksQuery`, `usePublisherSimulate()`
- Produces:
  - `renderShareCardToCanvas(canvas: HTMLCanvasElement, options: ShareCardOptions): void` in `apps/web/src/features/share-studio/canvas-renderer.ts` supporting 4 templates:
    1. `strava_sticker`: **Transparent PNG Sticker** (large `Red Hat Mono` metrics for *Pages Read*, *Duration*, *Pace WPM*, *Current Streak*, 7-day activity bar chart, and AnzaBook monogram `/icon.svg` in Furrow Tangerine `#F06A24`) ready to overlay on coffee/book photos in IG Story
    2. `quote_card`: **Notebook Quote Highlight Card** (`8px` Furrow grid background, book title, author, page badge, and quote text up to 280 chars)
    3. `literacy_receipt`: **Literacy Receipt (Struk Bacaan)** summarizing books read, total pages, and reading hours formatted like a thermal bookshop receipt
    4. `milestone_poster`: **100% Finish / Reading Challenge Milestone Poster**
  - High-res PNG download (`canvas.toDataURL("image/png")`) and Web Share API integration
  - `PublisherStudioPanel`: Interactive multi-paper HPP & retail price simulator (`pageCount`, `printRun`, `authorRoyaltyPct`) displaying real-time cost breakdowns for *Edisi Rakyat (Newsprint 48.8 gsm)*, *Edisi Standar (Bookpaper 72 gsm)*, and *Edisi Kolektor (Hardcover)*
  - Updated `/_protected/app` (`apps/web/src/routes/_protected/app.tsx`) with `data-starter-placeholder` removed, providing 3 integrated workspace tabs:
    - **Rak Buku & Tantangan Baca** (`Smart Shelves` + multi-metric Reading Challenge: Buku, Halaman, Jam Baca)
    - **Flex Your Literacy (Strava Share Studio)**
    - **Publisher Studio (Kalkulator HPP Edisi Rakyat)**

- [ ] **Step 1: Implement `apps/web/src/features/share-studio/canvas-renderer.ts` and `share-studio-panel.tsx`**

Build deterministic HTML5 Canvas rendering for all 4 templates (`strava_sticker` with alpha transparency `clearRect`, `quote_card`, `literacy_receipt`, `milestone_poster`), custom quote input, session selector, live canvas preview, and `"Unduh PNG Resolusi Tinggi"` button (`data-testid="download-share-png"`).

- [ ] **Step 2: Implement `apps/web/src/features/publisher/publisher-studio-panel.tsx`**

Build the interactive HPP & Retail Margin calculator wired to `calculatePrintEconomics` / `/api/publisher/simulate`, showing how cutting the 45% distributor margin + using 48.8 gsm novel newsprint brings a Rp95.000 book down to Rp32.000 while keeping author royalty intact.

- [ ] **Step 3: Replace starter placeholder in `apps/web/src/routes/_protected/app.tsx`, update `apps/web/src/routes/_protected.tsx`, and delete `e2e/starter.spec.ts`**

Update `apps/web/src/routes/_protected.tsx` navigation to include links to **Katalog (`/`)**, **Ruang Baca & Studio (`/app`)**, **Catatan (`/notes`)**, and **Admin (`/admin`)** (when authorized), plus a theme mode switcher (`Manila`, `Sepia`, `Malam`).
Replace `apps/web/src/routes/_protected/app.tsx` completely so `data-starter-placeholder` is gone, and remove `e2e/starter.spec.ts`.

- [ ] **Step 4: Run `pnpm run doctor`, `pnpm run typecheck`, and `pnpm run lint`**

Run:
```powershell
pnpm run doctor
pnpm run typecheck
pnpm run lint
```
Expected: `pnpm run doctor` reports all checks passing and prints no starter placeholder reminder; `typecheck` and `lint` pass with 0 errors.

- [ ] **Step 5: Commit Task 8**

```powershell
git add apps/web/src/features/share-studio apps/web/src/features/publisher apps/web/src/routes/_protected.tsx apps/web/src/routes/_protected/app.tsx e2e/starter.spec.ts
git commit -m "feat(web): build Smart Shelves, Strava-style Share Studio PNG generator, and Publisher HPP Studio"
```

---

### Task 9: End-to-End Verification, Playwright Browser Tests & Antislop Delivery Gate

**Files:**
- Create: `e2e/anzabook.spec.ts`

**Interfaces:**
- Consumes: Full production build of `@starter/api` and `@starter/web` via `pnpm test:e2e`
- Produces: Automated browser verification covering landing animations, catalog, live stock tracker, protected reader DRM, Strava Share Studio, and Publisher HPP calculator

- [ ] **Step 1: Write Playwright E2E test suite in `e2e/anzabook.spec.ts`**

Test the complete user journey:
1. Visit `/`: verify the Opening Literary Curtain Preloader appears and can be skipped via `data-testid="skip-preloader"`, verify the Hero headline & primary CTA are visible at `1280x800`, and verify the 3D Hero Book Carousel (`HeroBookStage`) Pause/Play control (`data-testid="carousel-pause-toggle"`) toggles state cleanly.
2. Click into a book detail page (`/books/$slug`): switch between *Edisi Rakyat (Newsprint 48.8 gsm)* and *Edisi Standar*, verify price and paper GSM update, and filter the Live Store & Gramedia Stock Tracker by `Jakarta`.
3. Sign up a new user account, open `/app`: verify Smart Shelves, switch to **Flex Your Literacy (Strava Share Studio)**, render the **Strava Transparent Sticker**, and verify the canvas generates a valid `data:image/png;base64,...` output; switch to **Publisher Studio** and verify the HPP calculator updates prices when changing page count.
4. Open the Protected Web Reader (`/read/$slug`): toggle **Bilingual Split View (`ID + EN`)**, switch to **Intisari 20 Menit**, trigger the **Pre-Trigger Web DRM Shield** (via simulated `Alt`/`Shift` keydown or window `blur`), verify the DRM watermark overlay appears (`data-testid="drm-watermark-overlay"`), resume reading, and log a completed reading session.

- [ ] **Step 2: Run full quality gates (`pnpm check`, `pnpm build`, and `pnpm test:e2e`)**

Run:
```powershell
pnpm check
pnpm build
pnpm test:e2e
```
Expected: All lint, typecheck, unit/API integration tests, production builds, and Playwright E2E tests PASS.

- [ ] **Step 3: Commit Task 9**

```powershell
git add e2e/anzabook.spec.ts
git commit -m "test(e2e): add end-to-end Playwright suite for AnzaBook MVP and DRM reader flows"
```
