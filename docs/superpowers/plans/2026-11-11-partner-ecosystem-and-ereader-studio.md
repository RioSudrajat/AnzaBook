# Partner Ecosystem & Unified E-Reader Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Community, Publisher, and Author onboarding into a single-door Partner Program with Admin Profile Dossier review, multi-entity profile management, and a unified Medium/Substack-style E-Reader WYSIWYG studio for authors and publishers.

**Architecture:** 
1. Database: Extend `communityCalendars`, `publishers`, `authorApplications`, and `manuscriptSubmissions` in PostgreSQL/Drizzle with verification documents, rejection reasons, rich profile assets, and a draft state machine.
2. Shared & API: Strict Zod schemas and DTOs in `packages/shared`, Express services in `apps/api` guarding event creation by verified status, providing multi-entity user profiles, and powering draft/review lifecycle endpoints.
3. Web: Remove duplicate modal dialogs, route all onboarding to `/partner-program`, provide Admin Profile Dossier review, add managed entity lists & "Karya" tab in profile, add profile editing to `/c/$slug` and `/p/$slug`, and integrate WYSIWYG writing/reviewing directly into the E-Reader canvas.
4. E2E Verification: DevTools browser testing with screenshots, recording user journeys from single-door registration through E-Reader manuscript drafting, publisher review, and publishing.

**Tech Stack:** Express 5, Drizzle ORM, PostgreSQL, Better Auth, TanStack Start, TanStack Query, Tailwind CSS v4, Lucide React, Chrome DevTools MCP.

**Spec:** [partner_ecosystem_and_ereader_studio_blueprint.md](file:///C:/Users/SelembarAwan/.gemini/antigravity/brain/a5918030-469a-4711-b621-d0deaefdbddf/partner_ecosystem_and_ereader_studio_blueprint.md)

## Global Constraints

- Preserve all existing database tables and migrations; never reset or drop volumes.
- Anti-slop strict aesthetic: human-crafted, no purple neon glow cards, no redundant obvious comments.
- Single source of truth for onboarding: `/partner-program`.
- E-Reader canvas styling must match existing Manila/Sepia/Night typography and layout tokens.
- Evidence before assertions: run checks and browser tests to verify before claiming completion.

---

### Task 1: Skema Database & Drizzle Migrations

**Files:**
- Modify: `apps/api/src/db/schema/events.ts`
- Modify: `apps/api/src/db/schema/publishers.ts`
- Modify: `apps/api/src/db/schema/social.ts`
- Modify: `apps/api/src/db/schema/index.ts`
- Generate & Apply: `pnpm db:generate && pnpm db:migrate`

- [ ] **Step 1: Update Drizzle schemas with new columns and manuscript status**
- [ ] **Step 2: Generate Drizzle migration (`pnpm db:generate`)**
- [ ] **Step 3: Run migration (`pnpm db:migrate`)**
- [ ] **Step 4: Verify migration applied without errors**

---

### Task 2: Shared Contracts & Validators

**Files:**
- Modify: `packages/shared/src/types/api.ts`
- Modify: `packages/shared/src/validators/events.ts`
- Modify: `packages/shared/src/validators/publisher.ts`
- Modify: `packages/shared/src/validators/social.ts`

- [ ] **Step 1: Add DTOs for multi-entity profiles (`ManagedCommunitySummaryDto`, `ManagedPublisherSummaryDto`, etc.)**
- [ ] **Step 2: Add Zod schemas for manuscript draft creation, update, submit, and review**
- [ ] **Step 3: Add Zod schemas for updating community and publisher profiles**
- [ ] **Step 4: Verify typecheck passes on shared package**

---

### Task 3: Backend API Services & Routes

**Files:**
- Modify: `apps/api/src/services/events.service.ts`
- Modify: `apps/api/src/routes/events.routes.ts`
- Modify: `apps/api/src/services/publisher.service.ts`
- Modify: `apps/api/src/routes/publisher.routes.ts`
- Modify: `apps/api/src/services/social.service.ts`
- Modify: `apps/api/src/services/admin-cms.service.ts`
- Modify: `apps/api/src/routes/admin-cms.routes.ts`

- [ ] **Step 1: Update `events.service.ts` to strictly enforce `verificationStatus === 'verified' || 'trusted'` for `createEvent`, and add `updateCommunityCalendar`**
- [ ] **Step 2: Update `publisher.service.ts` with draft creation, update, submit, publisher inbox, and review**
- [ ] **Step 3: Update `social.service.ts` `getSocialProfile` to return all managed communities, publishers, and author works**
- [ ] **Step 4: Update `admin-cms.service.ts` with rejection reasons and verification documents in review queries**
- [ ] **Step 5: Run API tests to ensure no regressions**

---

### Task 4: Frontend Single-Door Onboarding & Admin Dossier Review

**Files:**
- Modify: `apps/web/src/features/events/components/dashboard-events.tsx`
- Modify: `apps/web/src/features/events/components/create-event-dialog.tsx`
- Modify: `apps/web/src/routes/_protected/communities.new.tsx`
- Modify: `apps/web/src/routes/_protected/publishers.new.tsx`
- Modify: `apps/web/src/routes/_protected/authors.new.tsx`
- Modify: `apps/web/src/features/admin/components/admin-cms-dashboard.tsx`

- [ ] **Step 1: Remove `ApplyCalendarDialog` popup from Agenda & Event creation; redirect to `/partner-program` with clear guidance**
- [ ] **Step 2: Ensure `/communities/new`, `/publishers/new`, and `/authors/new` submit verification documents and display a pending review confirmation**
- [ ] **Step 3: Implement rich Profile Dossier preview drawer/dialog in Admin CMS for Communities, Publishers, and Authors with ACC / Tolak + reason**

---

### Task 5: User Profile Management & Entity Pages

**Files:**
- Modify: `apps/web/src/features/dashboard/components/dashboard-profile.tsx`
- Modify: `apps/web/src/routes/u.$username.tsx`
- Modify: `apps/web/src/routes/c.$slug.tsx`
- Modify: `apps/web/src/routes/p.$slug.tsx`

- [ ] **Step 1: In `DashboardProfile`, update `Komunitas` and `Penerbit` tabs to show full lists with status badges (`verified`, `pending`, `rejected`)**
- [ ] **Step 2: Add public "Karya" tab for verified authors in user profiles**
- [ ] **Step 3: In `/c/$slug` and `/p/$slug`, add manager controls: "Edit Tampilan", quick action "+ Buat Acara" (community), and "Inbox Naskah Masuk" (publisher)**

---

### Task 6: Unified E-Reader WYSIWYG Studio

**Files:**
- Create/Modify: `apps/web/src/features/reader/components/reader-studio-workspace.tsx`
- Modify: `apps/web/src/routes/_protected/read.$slug.tsx` (or studio route)
- Modify: `apps/web/src/features/social/components/manuscript-studio-dialog.tsx`

- [ ] **Step 1: Wire "Tambah Karya Baru" in Studio Penulis to open the E-Reader Editor canvas**
- [ ] **Step 2: Implement in-place WYSIWYG editing, chapter management in the TOC sidebar, and Draft auto-save**
- [ ] **Step 3: Implement "Kirim ke Penerbit" modal in E-Reader topbar**
- [ ] **Step 4: Enable Publisher review mode in the same E-Reader canvas with paragraph commenting, editorial changes, and "Terbitkan Buku" / "Minta Revisi" actions**

---

### Task 7: E2E Verification & Interactive Report Artifact

- [ ] **Step 1: Perform full browser tests using DevTools MCP (register, review/ACC, profile check, write in E-Reader, review as publisher)**
- [ ] **Step 2: Capture screenshots of critical milestones**
- [ ] **Step 3: Generate the comprehensive verification report artifact for user review**
