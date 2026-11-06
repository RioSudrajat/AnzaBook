# E-Reader Slide Mode Book Spread & 3D Page Turn Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AnzaBook's e-reader slide mode into a physical 2-page open book spread on desktop with authentic 3D page-turn physics, accurate cumulative book pagination, matching title font sizes between scroll and slide modes, and book rating capabilities in both reading layouts.

**Architecture:** 
1. Harmonize chapter typography tokens across scroll and slide modes.
2. Extend `@starter/shared/chapter-pagination` to compute continuous cumulative book pagination across all accessible chapters.
3. Build a modular `ReaderSlideView` component encapsulating desktop 2-page open book spread, responsive 1-page mobile layout, spine lighting/gutter, and GPU-accelerated 3D page turn transitions (`motion/react`).
4. Implement a clean `RatingDialog` connected to `POST /api/books/:slug/reviews` and surface rating triggers in both slide mode bottom bar and scroll mode bottom actions.

**Tech Stack:** React 19, TanStack Start & Router, Tailwind CSS v4, `motion/react` (Framer Motion 13), Vitest.

**Spec:** User screenshot reference (`media_1793966942604_cf0ac118.jpg`), Anti-slop strict aesthetic guidelines.

## Global Constraints

- Never use generic AI-slop gradients or neon glow cards; adhere to AnzaBook's literary paper/ink palette.
- Maintain WCAG AA contrast for reading text (minimum 4.5:1).
- Mobile layout (< 768px) must render a single page with minimum 44x44px touch targets and zero horizontal overflow (`overflow-x: clip`).
- 3D transitions must run on GPU layers (`transform: rotateY, translateZ`, `will-change: transform`) and gracefully fall back to opacity cross-fade when `prefers-reduced-motion: reduce` is enabled.

## Review Focus

1. **Chapter boundary transitions**: When advancing past the last page of Chapter N, does it seamlessly turn to Chapter N+1 Page 1?
2. **Reverse chapter boundary**: When clicking previous on Page 1 of Chapter N, does it flip back to the final page of Chapter N-1?
3. **Cumulative pagination accuracy**: Does "Page X of Y" accurately sum pages across all accessible chapters and map back correctly?
4. **Responsive reflow**: Does desktop 2-page open book spread collapse gracefully to 1 readable page on mobile devices?
5. **Rating submission in both modes**: Does clicking "Beri Rating" in both slide mode and scroll mode persist ratings without breaking reading state?

---

### Task 1: Book-Level Pagination Utility & Unit Tests

**Files:**
- Modify: `packages/shared/src/chapter-pagination.ts`
- Modify: `apps/api/src/test/chapter-pagination.test.ts`

- [ ] **Step 1: Write failing tests for book-level pagination**
  Add unit tests in `apps/api/src/test/chapter-pagination.test.ts` testing:
  - Cumulative calculation across multiple chapters with `<!-- pagebreak -->` and fallback chunking.
  - Conversion between `{ chapterNumber, pageIndex }` and global `1..N` page number.
  - Reverse mapping from a global page number to `{ chapterNumber, pageIndex }`.

- [ ] **Step 2: Run test to confirm RED status**
  Run `pnpm test` (or `vitest run src/test/chapter-pagination.test.ts`).

- [ ] **Step 3: Implement cumulative book pagination helpers**
  In `packages/shared/src/chapter-pagination.ts`:
  - Implement `computeBookPagination(chapters, paragraphsPerPage)` returning total pages, chapter page counts, and cumulative offsets.
  - Implement `getGlobalPageNumber(chapterNumber, pageIndex, bookPagination)`.
  - Implement `getChapterAndPageFromGlobal(globalPage, bookPagination)`.

- [ ] **Step 4: Run tests to confirm GREEN status**
  Run `pnpm test` and verify all tests pass.

- [ ] **Step 5: Commit changes**
  `git commit -m "feat(shared): add cumulative book pagination helpers"`

---

### Task 2: Standardize Header & Chapter Title Sizes

**Files:**
- Modify: `apps/web/src/routes/_protected/read.$slug.tsx`

- [ ] **Step 1: Audit existing header classes**
  Verify the exact classes in slide mode:
  - Label: `text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2`
  - Title: `font-serif text-2xl sm:text-3xl font-bold tracking-tight`
- [ ] **Step 2: Apply identical typography in scroll mode**
  In `apps/web/src/routes/_protected/read.$slug.tsx`:
  - Replace `lg:text-4xl leading-tight` on Chapter 1 header with `text-2xl sm:text-3xl font-bold tracking-tight`.
  - Ensure subsequent chapter headers share the exact same sizing.
- [ ] **Step 3: Verify build and visual consistency**
  Run `pnpm --filter @starter/web run build` and check for type/lint errors.
- [ ] **Step 4: Commit changes**
  `git commit -m "fix(web): harmonize reader chapter title sizes between scroll and slide modes"`

---

### Task 3: Rating Dialog & Community Review Integration

**Files:**
- Create: `apps/web/src/features/reader/components/rating-dialog.tsx`
- Modify: `apps/web/src/features/books/hooks.ts` (or add review mutation hook if missing)
- Modify: `apps/web/src/routes/_protected/read.$slug.tsx`

- [ ] **Step 1: Create Review API hook**
  In `apps/web/src/features/books/hooks.ts` or `features/community/hooks.ts`, add `useCreateBookReview` calling `POST /api/books/${slug}/reviews`.
- [ ] **Step 2: Build `RatingDialog` component**
  In `apps/web/src/features/reader/components/rating-dialog.tsx`:
  - 5-star interactive rating selection with hover and active states.
  - Optional review comment input.
  - Accessible dialog (`role="dialog"`, keyboard traps, ESC close).
  - Submit button with pending state and feedback.
- [ ] **Step 3: Integrate Rating trigger into Scroll Mode**
  In `apps/web/src/routes/_protected/read.$slug.tsx`:
  - Add "☆ Beri Rating" button in scroll mode bottom completion section and floating bar.
- [ ] **Step 4: Commit changes**
  `git commit -m "feat(web): add book rating dialog to e-reader"`

---

### Task 4: 2-Page Book Spread & 3D Page Turn Animation for Slide Mode

**Files:**
- Create: `apps/web/src/features/reader/components/reader-slide-view.tsx`
- Modify: `apps/web/src/routes/_protected/read.$slug.tsx`

- [ ] **Step 1: Implement `ReaderSlideView` structure**
  In `apps/web/src/features/reader/components/reader-slide-view.tsx`:
  - Desktop view: Open book 2-page spread (`grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12`) with subtle spine binding shadow/crease in the center.
  - Mobile view: Single-page readable flow (`overflow-x: clip`, padding, 44px touch targets).
  - Left page rendering: Chapter label + Title (if page 1) + first set of paragraphs.
  - Right page rendering: Continuation paragraphs / elements.
- [ ] **Step 2: Implement 3D Physical Page Turn Physics**
  - Use `motion.div` with `AnimatePresence(mode="popLayout", custom={ direction })`.
  - Realistic 3D rotation (`rotateY: -180deg` / `rotateY: 0deg`) with `transform-origin` fixed at the center spine (`left center` for forward flip, `right center` for backward flip).
  - Dynamic ambient shadow gradient overlay simulating paper curvature and light blockage during turn.
  - Reduced-motion query check (`prefers-reduced-motion`) to provide clean opacity crossfade without disorientation.
- [ ] **Step 3: Build Slide Bottom Navigation Bar matching Screenshot**
  - Fixed / docked bottom bar:
    - Left: `☆ Beri Rating` button (opens RatingDialog).
    - Center: `< Page X of Y >` with ChevronLeft and ChevronRight buttons and keyboard navigation (ArrowLeft / ArrowRight).
    - Right: `✓ Selesai Dibaca` button (triggers session completion modal).
- [ ] **Step 4: Integrate `ReaderSlideView` into `read.$slug.tsx`**
  - Replace legacy inline slide mode markup with `<ReaderSlideView ... />`.
  - Wire cumulative global page navigation and automatic seamless chapter transitions.
- [ ] **Step 5: Verify build & tests**
  Run `pnpm test` and `pnpm --filter @starter/web run build`.
- [ ] **Step 6: Commit changes**
  `git commit -m "feat(web): add realistic 3D book spread and page-turn animation in slide mode"`

---

### Task 5: End-to-End Verification & Polish

**Files:**
- Modify: `e2e/anzabook.spec.ts` (or add new reader tests)

- [ ] **Step 1: Run comprehensive tests and typecheck**
  Run `pnpm check`.
- [ ] **Step 2: Verify responsive design and accessibility**
  Test in browser at mobile (375x667) and desktop (1280x800).
- [ ] **Step 3: Commit and push final verification**
  `git commit -m "chore: verify reader slide spread, 3D flip, and rating integration"`
