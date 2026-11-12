# Unified E-Reader Tiptap Editorial & Manuscript Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AnzaBook's existing scroll-mode E-Reader into a unified, industry-standard editorial studio using Tiptap / ProseMirror with custom separators (page break, chapter break, Nakama paywall), a live Substack-style formatting toolbar, book header with cover image, and comprehensive pre-submission manuscript configuration for authors and publishers.

**Architecture:** Integrate Tiptap WYSIWYG editing directly into `apps/web/src/routes/_protected/read.$slug.tsx` and `ReaderToolbar`. Custom Tiptap Node extensions handle page breaks, chapter breaks, and Nakama paywall boundaries. The editor serializes live content into structured JSON blocks and clean HTML. Submission workflows integrate multi-tier configuration (languages, free/premium/physical tiers, economics) before dispatching to publishers.

**Tech Stack:** React 19, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`, TanStack Start, Tailwindcss v4, Drizzle ORM, Express 5.

---

## Global Constraints
- Must use existing E-Reader route (`read.$slug.tsx`) in scroll mode—no separate isolated canvas.
- Must preserve Literata serif typography, theme colors (Manila, Sepia, Night), and responsive padding.
- Anti-slop strict aesthetic: no purple neon gradients, no clunky borders, authentic human-crafted publisher tools.
- All code must pass `@starter/shared`, `@starter/api`, and `@starter/web` typechecks and test suites.

---

## Tasks

- [ ] **Task 1: Custom Tiptap Separator Extensions & Schema Definition**
  - **Files:**
    - Create: `apps/web/src/features/reader/editor/extensions/page-break.ts`
    - Create: `apps/web/src/features/reader/editor/extensions/chapter-break.ts`
    - Create: `apps/web/src/features/reader/editor/extensions/nakama-paywall.ts`
    - Create: `apps/web/src/features/reader/editor/extensions/index.ts`
  - **Details:**
    - Build `PageBreakNode` extension rendering `<div data-type="page-break" class="page-break-divider">` with label "Pemisah Halaman".
    - Build `ChapterBreakNode` extension rendering `<div data-type="chapter-break" class="chapter-break-divider">` with chapter label and title editable input.
    - Build `NakamaPaywallNode` extension rendering `<div data-type="nakama-paywall" class="nakama-paywall-divider">` with Nakama lock badge.
  - **Verification:** Unit tests verifying serialization and node parsing.

- [ ] **Task 2: Substack-Style Rich Formatting Toolbar Component**
  - **Files:**
    - Create: `apps/web/src/features/reader/editor/components/substack-editor-toolbar.tsx`
    - Create: `apps/web/src/features/reader/editor/components/editor-styles.css`
  - **Details:**
    - Render toolbar underneath the E-Reader sticky top bar when in `mode="edit"`.
    - Tools: Undo/Redo, Style dropdown (Heading 1, Heading 2, Paragraph, Subtitle, Quote), Bold, Italic, Strike, Code, Color, Link, Image, Bullet list, Ordered list, Blockquote.
    - Separator dropdown ("Pemisah"): Pemisah Halaman, Pemisah Bab, Dinding Gratis (Nakama Paywall).
  - **Verification:** Render component in story/isolated test; verify active state toggling on Tiptap commands.

- [ ] **Task 3: E-Reader Scroll Mode Book Header & Cover Section**
  - **Files:**
    - Create: `apps/web/src/features/reader/components/reader-book-header.tsx`
    - Modify: `apps/web/src/features/reader/components/reader-toolbar.tsx`
    - Modify: `apps/web/src/routes/_protected/read.$slug.tsx`
  - **Details:**
    - Insert header before Chapter 1 in scroll mode:
      - Publisher / Author name.
      - Large serif Book Title (editable in edit mode).
      - Chapter count badge ("8 chapters").
      - Book cover image on the right (with upload / image URL button in edit mode).
    - In `ReaderToolbar`, add `[Edit]` vs `[Preview]` segmented toggle for author/publisher users.
  - **Verification:** Inspect scroll mode rendering and verify cover image and title positioning matches design.

- [ ] **Task 4: Integrate Tiptap Live WYSIWYG Canvas into ReaderBook**
  - **Files:**
    - Modify: `apps/web/src/routes/_protected/read.$slug.tsx`
    - Modify: `apps/web/src/features/reader/components/reader-book.css`
  - **Details:**
    - Wire `useEditor` from `@tiptap/react` inside the reading canvas when editing manuscripts or books.
    - Synchronize content live with debounced auto-save and structured JSON serialization.
    - Seamlessly switch between `preview` (standard reader rendering) and `edit` (Tiptap live editor).
  - **Verification:** Edit text live, format with bold/headings, insert separators, and ensure no HTML tags bleed into raw text.

- [ ] **Task 5: Author Manuscript Comprehensive Configuration Modal**
  - **Files:**
    - Create: `apps/web/src/features/reader/components/manuscript-config-dialog.tsx`
    - Modify: `apps/web/src/features/social/components/author-studio-section.tsx`
    - Modify: `packages/shared/src/validators/manuscript.ts`
  - **Details:**
    - Modal popup before submitting draft to publisher:
      - **Bahasa**: Checklist ketersediaan Bahasa Indonesia & Bahasa Inggris.
      - **Akses & Distribusi**: Pilihan Free, Premium (Nakama Member), atau Cetak Fisik (Paperback/Hardcover).
      - **Informasi Naskah**: Kategori, Sinopsis, Target Usia/Pembaca, Perkiraan Halaman, Target Penerbit.
    - Connect submission API to persist full configuration payload.
  - **Verification:** Test dialog submission, verify payload matches validator schema.

- [ ] **Task 6: Publisher Review Controls & Publishing Configuration in E-Reader**
  - **Files:**
    - Modify: `apps/web/src/features/reader/components/reader-studio-workspace.tsx`
    - Modify: `apps/web/src/routes/p.$slug.tsx`
    - Modify: `apps/api/src/services/manuscripts.service.ts`
  - **Details:**
    - When publisher opens manuscript in E-Reader, display author configurations.
    - Add publishing modal where publisher sets à la carte price IDR, royalty rate %, Nakama eligibility, and editorial notes before clicking "Terbitkan Buku".
  - **Verification:** Verify publisher can review, adjust pricing/access, and publish directly from E-Reader.

- [ ] **Task 7: End-to-End Browser Testing & Visual Verification**
  - **Files:**
    - Run E2E automation via Chrome DevTools MCP.
    - Validate scroll mode header, cover image, Edit/Preview toggle, Substack toolbar, live bold/headings, custom separators, and pre-submission configuration modal.
    - Capture screenshots and generate updated verification report.
