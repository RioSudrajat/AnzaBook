# AnzaBook Repository Cleanup & GitHub Remote Preparation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up and standardize the AnzaBook monorepo prior to pushing to GitHub by setting the remote origin, removing legacy "ngodingpakeai" branding/copyrights, renaming Docker container project prefixes to `anzabook-pg-*`, hardening `.gitignore`, updating `README.md` with the user's exact one-liner, and preserving technical starter instructions in `docs/starter-reference.md`.

**Architecture:** A unified TypeScript monorepo with an Express 5 API (`apps/api`), TanStack Start web app (`apps/web`), and shared contracts (`packages/shared`). Internal package scope (`@starter/*`) is intentionally retained for monorepo stability while root metadata, Docker container namespaces, and public documentation reflect AnzaBook.

**Tech Stack:** Node.js >= 22.12, pnpm workspaces, Turborepo, Docker Compose, Git, Express 5, TanStack Start, PostgreSQL, Drizzle ORM.

**Spec:** User prompt requesting GitHub remote setup (`https://github.com/RioSudrajat/AnzaBook.git`), removing "ngodingpakeai" branding and container prefixes, hardening `.gitignore`, creating a clean AnzaBook `README.md` with one-liner `"Digital publishing, reading, and community platform"`, and preserving vital starter technical context for AI agents.

## Global Constraints

- Retain monorepo package scope as `@starter/*` (`@starter/shared`, `@starter/api`, `@starter/web`) per user direction to avoid widespread import churn.
- Docker Compose project name must use prefix `anzabook-pg-` instead of `ngodingpakeai-pg-`.
- Do not modify or leak secret keys in `.env.local` (Midtrans keys, DB passwords, Better Auth secrets).
- Ensure `.gitignore` safely ignores all environment files, temporary files, editor caches, and certificate keys.
- Preserve agent operational knowledge by maintaining setup scripts and saving full starter architecture reference to `docs/starter-reference.md`.

## Review Focus

- Git remote is configured correctly and points to `https://github.com/RioSudrajat/AnzaBook.git`.
- No lingering `ngodingpakeai` references in `package.json`, `LICENSE`, `compose` generator scripts, or root files.
- `.env.local` retains its actual DB credentials and ports, updating only the Compose project prefix to prevent Docker conflict or data loss.
- `README.md` opens with `# AnzaBook` and `Digital publishing, reading, and community platform.`, followed by clear development and setup guidelines.
- `pnpm run doctor` and type checks succeed without configuration regressions.

---

### Task 1: Configure Git Remote Origin

**Files:**
- Modify: Git configuration via git CLI

- [ ] **Step 1: Verify current git remotes**
  Run: `git remote -v`
  Confirm: No origin currently configured.

- [ ] **Step 2: Add remote origin**
  Run: `git remote add origin https://github.com/RioSudrajat/AnzaBook.git`

- [ ] **Step 3: Verify remote configuration**
  Run: `git remote -v`
  Verify output matches `https://github.com/RioSudrajat/AnzaBook.git` for both fetch and push.

---

### Task 2: Rebrand Metadata & Docker Container Naming

**Files:**
- Modify: `package.json:2`
- Modify: `LICENSE:3`
- Modify: `scripts/lib.mjs:90-99`
- Modify: `scripts/test-setup.mjs:16`
- Modify: `tests/setup.test.mjs:29`
- Modify: `AGENTS.md:139`
- Modify: `.env.local:12`
- Delete: `.ngodingpakeai/` directory

- [ ] **Step 1: Update root `package.json`**
  Change `"name": "ngodingpakeai-starter-monorepo"` to `"name": "anzabook"`.

- [ ] **Step 2: Update `LICENSE`**
  Change `Copyright (c) 2026 ngodingpakeai contributors` to `Copyright (c) 2026 AnzaBook contributors`.

- [ ] **Step 3: Update `scripts/lib.mjs` container and database defaults**
  In `scripts/lib.mjs`:
  Change `COMPOSE_PROJECT_NAME` generator fallback from `ngodingpakeai-pg-${randomBytes(6).toString("hex")}` to `anzabook-pg-${randomBytes(6).toString("hex")}`.
  Change fallback `POSTGRES_USER` and `POSTGRES_DB` to `"anzabook"`.

- [ ] **Step 4: Update test regex assertions**
  In `scripts/test-setup.mjs` line 16 and `tests/setup.test.mjs` line 29:
  Update pattern from `ngodingpakeai-pg-` to `anzabook-pg-`.

- [ ] **Step 5: Update `.env.local` Compose project name**
  In `.env.local`:
  Update `COMPOSE_PROJECT_NAME="ngodingpakeai-pg-2bc80f4fa8d9"` to `COMPOSE_PROJECT_NAME="anzabook-pg-2bc80f4fa8d9"`.

- [ ] **Step 6: Update `AGENTS.md` monorepo description**
  Change `This is the **Express + TanStack Start + PostgreSQL monorepo** of the ngodingpakeai starter family.` to:
  `This is the **Express + TanStack Start + PostgreSQL monorepo** powering **AnzaBook**.`

- [ ] **Step 7: Remove obsolete `.ngodingpakeai` folder**
  Remove `.ngodingpakeai/template.json` and directory `.ngodingpakeai`.

---

### Task 3: Harden `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Review current `.gitignore`**
  Examine existing rules to ensure essential entries are preserved.

- [ ] **Step 2: Add comprehensive ignores**
  Add explicit rules for:
  - OS generated files: `Thumbs.db`, `ehthumbs.db`, `Desktop.ini`, `._*`
  - IDE & editor files: `.idea/`, `*.sublime-project`, `*.sublime-workspace`, `.vscode/*` with `!.vscode/mcp.json`
  - Debug & process logs: `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`, `pnpm-debug.log*`
  - Sensitive files & credentials: `*.pem`, `*.key`, `*.cert`
  - Temporary & cache files: `*.tmp`, `*.temp`, `.eslintcache`, `temp/`, `tmp/`

- [ ] **Step 3: Verify git status ignores unwanted files**
  Run: `git status --ignored` to confirm `.env.local` and temporary items remain untracked.

---

### Task 4: Preserve Starter Technical Guide & Update `README.md`

**Files:**
- Create: `docs/starter-reference.md`
- Modify: `README.md`

- [ ] **Step 1: Create `docs/starter-reference.md`**
  Migrate detailed starter template documentation, philosophy, and reference tables so AI agents or developers needing historical starter architecture can reference it without cluttering root `README.md`.

- [ ] **Step 2: Rewrite `README.md` for AnzaBook**
  Update `README.md` with:
  - Header: `# AnzaBook`
  - One-liner: `Digital publishing, reading, and community platform.`
  - Short summary of what AnzaBook does (curated digital library, physical Newsprint books, reader studio, community events, and membership).
  - Quick Start guide (`pnpm run setup`, `pnpm dev`, Docker requirements).
  - Architecture breakdown (`Browser -> Express API / Web SSR -> Drizzle / Postgres`).
  - Essential Commands table (`pnpm dev`, `pnpm check`, `pnpm db:up/down/migrate`, `pnpm run doctor`).
  - Navigation links to `docs/` (`docs/architecture.md`, `docs/backend.md`, `docs/frontend.md`, `docs/anzabook-membership.md`, `docs/starter-reference.md`, `AGENTS.md`).

---

### Task 5: Verification & Diagnostics

**Files:**
- Verification only

- [ ] **Step 1: Run doctor script**
  Run: `pnpm run doctor`
  Verify: Node.js, pnpm, origins, cookie checks, and project files pass.

- [ ] **Step 2: Run type check**
  Run: `pnpm run typecheck`
  Verify: Shared, web, and API packages compile with zero errors.

- [ ] **Step 3: Verify Git Status and Remote**
  Run: `git status` and `git remote -v`
  Confirm all changes are accounted for, git remote origin is correctly set, and repo is ready for staging and commit.
