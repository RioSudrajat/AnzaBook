# Team Collaboration, GitHub Governance & Environment Setup — AnzaBook

**Date:** 2026-11-20 (revised 2026-11-21 after full-green CI baseline `c6be73f`)  
**Status:** Ready for Final Approval  
**Target Repo:** `https://github.com/RioSudrajat/AnzaBook` (Personal `User` repo, visibility: `PUBLIC`)  
**Primary Milestone:** Hackathon Semifinal Submission — **30 November 2026** (9–10 days), built as a long-term startup engineering foundation.

---

## 1. Intent & Why

AnzaBook is transitioning from solo-founder development (direct commits to `main`) into a 4-person startup engineering team. The hackathon semifinal on **30 November 2026** is a strategic marketing and proof-of-idea launchpad, not a throwaway prototype.

Because all 4 team members actively use AI coding assistants, the team's bottleneck is no longer code typing speed — it is **product alignment, architecture boundaries, and review quality**. Without explicit GitHub governance, parallel AI-assisted development on this monorepo risks:

- Conflicting Drizzle database migrations (`apps/api/drizzle/meta/_journal.json`)
- Merge conflicts on TanStack Start's generated router file (`apps/web/src/routeTree.gen.ts`)
- Broken cross-package contracts in `packages/shared/`
- Oversized AI-generated PRs that violate `DESIGN.md` / `AGENTS.md` and bottleneck code review
- The founder fixing bugs solo instead of driving product specs, fast PR reviews, demo narrative, and market validation

This design establishes a lightweight, startup-grade GitHub-native collaboration system (Spec-Driven Delegation + Trunk-Based Environments + Full-Green Parallel CI Gates) that can be rolled out today and scale cleanly past the hackathon.

---

## 2. Team Roster & Ownership Boundaries

All 4 GitHub collaborators are already registered on `RioSudrajat/AnzaBook` (personal account repo, retained through 30 Nov per Decision 1B):

| Name                    | GitHub Handle           | Repo Role | Product / Engineering Role                   | Primary Ownership Areas                                                                                                                                                                                                                                                                     |
| :---------------------- | :---------------------- | :-------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Selembar Awan (Rio)** | `@RioSudrajat`          | `admin`   | Founder, PM, Project Manager, Fullstack Lead | Product vision, Issue specs & prioritization, `packages/shared/` governance, `PRD_AnzaBook.md`, `DESIGN.md`, `AGENTS.md`, PR reviews, emergency admin bypass, and **GitHub Custodian** (Repository Settings, entering/rotating GitHub Environment Secrets, triaging Secret Scanning alerts) |
| **Raka**                | `@rakaalpiansyah`       | `write`   | Fullstack Dev                                | `apps/web/` (UI, TanStack Start routes, TanStack Query hooks) and `e2e/` Playwright tests                                                                                                                                                                                                   |
| **Salman**              | `@SalmanMuhammadRidwan` | `write`   | Backend Dev                                  | `apps/api/` (Express routes, services, API tests), `tests/`, and **Drizzle schema/migration gatekeeper** (`apps/api/src/db/`, `apps/api/drizzle/`)                                                                                                                                          |
| **Rizkia**              | `@luminariadev`         | `write`   | DevOps Engineer & Security                   | `.github/`, Dockerfiles, `compose.*.yaml`, `scripts/`, `docs/deployment.md`, Staging/Production cloud infra, deploy workflows, required secrets manifest (handed off out-of-band to `@RioSudrajat` for GitHub Environments), and security/DRM/RBAC auditing                                 |

---

## 3. Goals, Non-Goals, and Anti-Goals

### Goals

1. **100% GitHub-native delegation**: GitHub Issues (with AI-ready structured briefs), Labels, Hackathon Milestone, and a Kanban board workflow — no separate Jira/Linear/Trello overhead.
2. **Safe parallel AI-assisted coding**: Multi-owner `CODEOWNERS` (zero self-approval deadlocks), `CONTRIBUTING.md`, and `AGENTS.md` team rules covering Contract-First (`packages/shared`), Drizzle migration coordination (`apps/api/drizzle/`), `routeTree.gen.ts`, and PR hygiene.
3. **Lightweight Trunk-Based Staging & Production**: `main` serves as the continuously deployable Staging branch; `production` serves as the controlled Production release branch.
4. **Fast, full-strength CI protection from Day 1**: Leverage the now-green `main` baseline (`c6be73f`) by parallelizing `.github/workflows/ci.yml` into 3 required jobs (`lint-typecheck-build`, `unit-test`, `e2e`) — giving fast ~1-minute feedback on lint/format/types/build while enforcing 100% full-repo lint, formatting, unit tests, and E2E tests on every PR with zero custom diff-lint workarounds.
5. **Founder safety valve**: Emergency admin bypass on Rulesets for `@RioSudrajat` while keeping normal PRs reviewable by teammates without routine bypasses.

### Non-Goals

- Transferring the repo to a GitHub Organization before 30 Nov (deferred to post-hackathon startup phase, tracked in Starter Issue #3).
- Provisioning cloud servers, domains, or managed PostgreSQL databases right now (handed to `@luminariadev` via Starter Issue #1).
- Adopting external project management tools outside GitHub (Jira, Linear, Trello).

### Anti-Goals

- **Regression back into lint/format/test debt**: Relaxing CI now that `main` is 100% green across lint, Prettier, typecheck, build, unit tests, and Playwright E2E.
- **Self-approval lockouts**: Assigning a single CODEOWNER to any path so the founder is forced to click Admin Bypass on routine PRs.
- **Squash-induced drift between `main` and `production`**: Squash-merging `main` -> `production` promotion PRs (which causes recurring false merge conflicts on subsequent releases).
- **Heavy GitFlow bureaucracy**: Maintaining 3 long-lived branches (`dev` -> `staging` -> `main`) that slow down a 4-person sprint.

---

## 4. Constraints & Current Repo Facts

1. **Public Personal Repository (`User` owner)**: `RioSudrajat/AnzaBook` is `PUBLIC`, unlocking free GitHub Rulesets, `CODEOWNERS`, GitHub Environments with required reviewers, Secret Scanning / Push Protection, and unlimited Actions minutes. Because it is a personal `User` repo, only `@RioSudrajat` has `admin` access to Repository Settings, Environment Secrets, and Secret Scanning alerts.
2. **Full-Green Baseline & Clean Working Tree**:
   - Commits `d5863b8` and `c6be73f` resolved all prior ESLint, Prettier, seed/explore, and Playwright E2E failures, and cleanly committed the 3 previously uncommitted local files.
   - Latest GitHub Actions run (`44788440295` on `c6be73f`) passed **100% GREEN** in 5m 12s (single serial job running `pnpm run setup`, `pnpm check`, `pnpm format:check`, `pnpm build`, and `pnpm test:e2e`).
   - Local git working tree is clean on `main...origin/main`.
3. **`gh` CLI Auth Scopes**: Authenticated as `RioSudrajat` with scopes `gist`, `read:org`, `repo`, `workflow`. It can configure repo settings, labels, milestones, environments, rulesets, branches, and issues directly, but lacks `project` scope for GitHub Projects v2 creation via CLI.
4. **Cross-Origin Auth Cookie Rule**: Per `docs/deployment.md`, Staging and Production API + Web services must share a parent domain (`COOKIE_DOMAIN`) and run over HTTPS with `TRUST_PROXY` set to the exact proxy hop count (never `true`).

---

## 5. Approaches Considered & Decisions Made

### Decision 1: Branching & Environment Strategy

- **Approach A — Lightweight Trunk-Based (`main` = Staging, `production` = Prod) [SELECTED]**
  - Feature branches (`feat|fix|ops|chore/<issue>-<slug>`) merge into `main` via Squash PRs (`main` = Staging).
  - Verified builds on `main` promote to `production` via a standard merge-commit PR (`main` -> `production`, optionally tagged `v0.x.y`) so git ancestry stays intact with zero repeated conflicts.
- **Approach B — Classic 3-Branch (`dev` -> `staging` -> `main`) [REJECTED]**
  - Rejected due to high branch-sync overhead and repeated conflicts on `apps/api/drizzle/meta/_journal.json` and `apps/web/src/routeTree.gen.ts`.

### Decision 2: Repo Ownership Model (`1B`)

- **1B — Stay on personal repo `RioSudrajat/AnzaBook` through 30 Nov [SELECTED]**
  - Avoids URL/remote churn during the sprint. `@RioSudrajat` acts as GitHub Custodian for Environment Secrets & Secret Scanning alerts; `@luminariadev` owns cloud infra, Docker/deploy workflows, and secret manifest handoff (never via git/Issues). Migrate to a GitHub Organization post-hackathon (Starter Issue #3).
- **1A — Transfer to GitHub Organization upfront [REJECTED for now]**
  - Deferred to post-30 Nov startup phase to keep pre-hackathon setup zero-friction.

### Decision 3: CI Gate Strategy (Upgraded After Full-Green Baseline `c6be73f`)

- **Full-Strength Parallel Split CI [SELECTED — supersedes temporary diff-only lint workaround]**
  - Because `main` now passes whole-repo `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test`, and `pnpm test:e2e`, no custom `scripts/lint-changed.mjs` workaround or legacy lint-cleanup issue is needed.
  - Split `.github/workflows/ci.yml` into 3 parallel, **all-required** jobs (cutting wall-clock CI time from ~5m15s serial to ~2.5–3m parallel and surfacing lint/format/type failures in ~60s):
    1. `lint-typecheck-build` (**Required**): `pnpm lint` + `pnpm format:check` + `pnpm typecheck` + `pnpm build` (no Docker needed).
    2. `unit-test` (**Required**): `pnpm test` (isolated disposable Docker Postgres + API vitest + root tests).
    3. `e2e` (**Required**): Playwright Chromium + `pnpm test:e2e` (isolated disposable Docker Postgres + production build + browser tests).
- **Keep Monolithic Single Job `check` [REJECTED]**
  - Works, but runs everything serially (~5m15s), starts an unused dev Postgres container via `pnpm run setup`, and makes devs wait longer to isolate whether lint, unit tests, or E2E broke.
- **Diff-Only Lint Workaround (`scripts/lint-changed.mjs`) [OBSOLETE]**
  - No longer needed now that zero lint/format debt exists on `main`.

### Decision 4: Ruleset Bypass & `CODEOWNERS` Co-Ownership (`3A`)

- **Selected**: Grant `Repository Admin` (`@RioSudrajat`) bypass permission on `main` and `production` rulesets for genuine hackathon emergencies.
- **3A — Multi-owner `CODEOWNERS` across every path [SELECTED]**
  - Every rule (including `*` and the 4 root specs/guides) includes a backup co-owner so `@RioSudrajat`'s routine PRs can be peer-approved without routinely clicking Admin Bypass, while team convention preserves Founder authority over product direction (`PRD_AnzaBook.md`, `DESIGN.md`).

---

## 6. Detailed System Design

### Part A — Repository Governance Files

#### 1. `.github/CODEOWNERS`

Every path has at least 2 owners to prevent self-approval lockouts while routing reviews to domain experts:

```text
# Default fallback (Founder + DevOps backup)
* @RioSudrajat @luminariadev

# Product specs & frontend design (Founder authority + Fullstack co-reviewer)
/PRD_AnzaBook.md @RioSudrajat @rakaalpiansyah
/DESIGN.md @RioSudrajat @rakaalpiansyah

# AI & team governance guides (Founder + DevOps co-reviewer)
/AGENTS.md @RioSudrajat @luminariadev
/CONTRIBUTING.md @RioSudrajat @luminariadev

# Shared contract layer & root workspace manifests
/packages/shared/ @RioSudrajat @SalmanMuhammadRidwan @rakaalpiansyah
/package.json @RioSudrajat @SalmanMuhammadRidwan @rakaalpiansyah @luminariadev
/pnpm-lock.yaml @RioSudrajat @SalmanMuhammadRidwan @rakaalpiansyah @luminariadev

# Backend API, database schema & Drizzle migrations (Salman primary + Founder)
/apps/api/ @SalmanMuhammadRidwan @RioSudrajat
/apps/api/src/db/ @SalmanMuhammadRidwan @RioSudrajat
/apps/api/drizzle/ @SalmanMuhammadRidwan @RioSudrajat
/tests/ @SalmanMuhammadRidwan @RioSudrajat

# Web frontend & Playwright E2E (Raka primary + Founder)
/apps/web/ @rakaalpiansyah @RioSudrajat
/e2e/ @rakaalpiansyah @RioSudrajat

# CI/CD, Docker, scripts, deployment & security config (Rizkia primary + Founder)
/.github/ @luminariadev @RioSudrajat
/scripts/ @luminariadev @RioSudrajat
/apps/api/Dockerfile @luminariadev @RioSudrajat
/apps/web/Dockerfile @luminariadev @RioSudrajat
/compose.dev.yaml @luminariadev @RioSudrajat
/compose.test.yaml @luminariadev @RioSudrajat
/docs/deployment.md @luminariadev @RioSudrajat
```

#### 2. `.github/ISSUE_TEMPLATE/` (AI-Ready Delegation Forms)

YAML Issue Forms structured so issues feed crisp product context directly into both humans and their AI assistants:

- `config.yml`: `blank_issues_enabled: false` with quick links to `CONTRIBUTING.md` and `PRD_AnzaBook.md`.
- `feature-task.yml`: **Feature / Task Brief (AI-Ready)** — Product Goal & Why, Target Area, Priority, Acceptance Criteria checklist, Target Files & Shared Contracts, Out of Scope, Requires Drizzle DB Migration? (`Yes — coordinate with @SalmanMuhammadRidwan` / `No`).
- `bug-report.yml`: **Bug Report** — Summary, Reproduction Steps, Expected vs Actual, Area, Severity, Logs/Screenshots.
- `devops-security.yml`: **DevOps / Security Task** — Environment (`staging`, `production`, `ci`, `both`), Objective, Security/Deployment Checklist, Required Secrets Handoff Note (confirming secret names only — never secret values — with `@RioSudrajat` as GitHub Custodian), Verification & Rollback Plan.

#### 3. `.github/PULL_REQUEST_TEMPLATE.md`

- `Closes #<issue-number>`
- **What & Why (author's own words)**: 2–4 concise bullets proving the author reviewed and understands any AI-assisted diff.
- **Monorepo Impact Checkboxes**:
  - Touches `packages/shared/`?
  - Adds/modifies Drizzle migration (`apps/api/drizzle/`)? (Coordinated with `@SalmanMuhammadRidwan`)
  - Regenerates `apps/web/src/routeTree.gen.ts`?
  - Touches auth, DRM, RBAC, cookies, CORS, or secrets? (Tag `@luminariadev`)
- **Verification Evidence**: Local commands run (`pnpm check`, `pnpm format:check`, `pnpm build`, plus `pnpm test:e2e` for auth/routing/UI changes) + UI screenshot/recording for `apps/web` changes.
- **PR Hygiene**: Single scoped issue, target <= ~400 logic lines (excluding lockfiles/generated files), follows `AGENTS.md` and `DESIGN.md`.

#### 4. `.github/workflows/ci.yml`

Replace the serial single-job workflow with 3 parallel, required jobs + concurrency cancellation:

- **Triggers**: `push` on `[main, production]` and `pull_request` on `[main, production]`.
- **Concurrency**: `group: ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`.
- **Permissions**: `contents: read`.
- **Jobs**:
  1. `lint-typecheck-build`: checkout, pnpm, node (`.nvmrc`, cache `pnpm`), `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
  2. `unit-test`: checkout, pnpm, node (`.nvmrc`, cache `pnpm`), `pnpm install --frozen-lockfile`, `pnpm test` (uses `scripts/test.mjs` with its own isolated disposable PostgreSQL container via `compose.test.yaml`).
  3. `e2e`: checkout, pnpm, node (`.nvmrc`, cache `pnpm`), `pnpm install --frozen-lockfile`, `pnpm exec playwright install --with-deps chromium`, `pnpm test:e2e`, upload `test-results/` artifact on failure (retention 7 days).

#### 5. `CONTRIBUTING.md` & Short Addendum to `AGENTS.md`

- **`CONTRIBUTING.md`**:
  - 10-minute onboarding (`pnpm run setup`, `pnpm run doctor`, `pnpm dev`, Docker requirement).
  - Team roles, ownership matrix, and `@RioSudrajat` GitHub Custodian / secret handoff protocol for `@luminariadev` (never paste secrets in Issues, PRs, or commits).
  - GitHub Kanban workflow (`Backlog` -> `Ready` -> `In Progress` -> `In Review` -> `Done`) and AI-Ready Issue delegation rules.
  - Branching & release model (Opsi A: `feat|fix|ops|chore/<issue>-<slug>` -> Squash PR to `main` [Staging] -> Merge-commit PR from `main` to `production` [Prod]).
  - Monorepo conflict rules:
    1. **Contract-First**: Agree/merge `packages/shared/` schema & DTO first when FE & BE split a feature.
    2. **Drizzle Migration Gate**: Coordinate with `@SalmanMuhammadRidwan` before `pnpm db:generate`; rebase onto latest `main` first so `apps/api/drizzle/meta/_journal.json` stays linear; never edit applied migrations.
    3. **`routeTree.gen.ts`**: Never hand-merge conflicts; rebase onto `main` and let TanStack Router regenerate it cleanly.
  - AI-assisted PR hygiene: 1 Issue = 1 PR, self-review AI diffs, <= ~400 logic lines, verify locally with standard `pnpm check && pnpm format:check && pnpm build` (plus `pnpm test:e2e` for UI/auth/routing changes).
  - Hackathon sprint cadence: daily 3-line async check-in, fast PR review SLA, H-2 code freeze (28 Nov).
- **`AGENTS.md` addendum**: Add a concise "Team Collaboration & Git Workflow" section referencing `CONTRIBUTING.md`, branch naming (`feat|fix|ops|chore/<issue>-<slug>`), never pushing directly to `main`/`production`, Drizzle migration coordination in `apps/api/drizzle/` with `@SalmanMuhammadRidwan`, and pre-PR verification (`pnpm check && pnpm format:check && pnpm build`).

---

### Part B — GitHub Repository Configuration (Applied via `gh` CLI)

1. **Repository Settings**:
   - `allow_squash_merge: true`
   - `allow_merge_commit: true` (required for clean `main` -> `production` release promotion PRs without recurring history-drift conflicts)
   - `allow_rebase_merge: false`
   - `delete_branch_on_merge: true`
   - Enable **Secret Scanning** & **Push Protection** via `security_and_analysis` (free on public repos; `@RioSudrajat` monitors alerts as Custodian with `@luminariadev`).

2. **Branches**:
   - `main` (default, Staging target).
   - Create `production` from verified `main` after governance files and parallel CI pass green.

3. **GitHub Rulesets**:
   - **Ruleset 1 — `Protect main (Staging)`** (`refs/heads/main`, `enforcement: active`):
     - Bypass actors: `RepositoryRole` Admin (`@RioSudrajat`, `bypass_mode: always`).
     - Rules: `deletion`, `non_fast_forward`, `pull_request` (`required_approving_review_count: 1`, `dismiss_stale_reviews_on_push: true`, `require_code_owner_review: true`, `require_last_push_approval: false`, `allowed_merge_methods: ["squash"]` if supported by API), `required_status_checks` (`strict_required_status_checks_policy: false`: `lint-typecheck-build`, `unit-test`, `e2e`).
   - **Ruleset 2 — `Protect production (Release)`** (`refs/heads/production`, `enforcement: active`):
     - Bypass actors: `RepositoryRole` Admin (`@RioSudrajat`, `bypass_mode: always`).
     - Rules: `deletion`, `non_fast_forward`, `pull_request` (`required_approving_review_count: 1`, `dismiss_stale_reviews_on_push: true`, `require_code_owner_review: false`, `allowed_merge_methods: ["merge"]` if supported by API), `required_status_checks` (`strict_required_status_checks_policy: false`: `lint-typecheck-build`, `unit-test`, `e2e`).

4. **GitHub Environments**:
   - `staging`: deployment branch policy limited to `main`.
   - `production`: deployment branch policy limited to `production`, with required reviewers `@RioSudrajat` and `@luminariadev`.

5. **Labels & Milestone**:
   - Add structured team labels:
     - Areas: `area:api`, `area:web`, `area:shared`, `area:devops`, `area:security`
     - Priorities: `priority:p0-hackathon`, `priority:p1-startup`, `priority:p2-later`
     - Types/Flags: `type:feature`, `type:chore`, `db:migration`, `status:blocked`, `ai-ready`
   - Create Milestone: **`Hackathon Semifinal (30 Nov 2026)`** (due `2026-11-30`).

6. **Starter Issues (Kickoff Backlog)**:
   - **Issue #1** (assigned `@luminariadev`, `area:devops`, `area:security`, `priority:p0-hackathon`, Milestone): _Setup Staging & Production infrastructure, shared `COOKIE_DOMAIN`, deploy workflows, required secrets manifest (handoff to `@RioSudrajat` as GitHub Custodian), and complete `docs/deployment.md` security checklist_.
   - **Issue #2** (assigned `@RioSudrajat`, `priority:p0-hackathon`, Milestone): _Finalize Hackathon 30 Nov demo scope, set up GitHub Projects Kanban board, and break down P0 tasks into AI-ready Issues for Raka & Salman_.
   - **Issue #3** (`area:devops`, `priority:p1-startup`): _Post-hackathon: Migrate `AnzaBook` to a dedicated GitHub Organization so DevOps/Security (`@luminariadev`) gets native admin/secrets/security-alerts permissions_.

7. **GitHub Projects (Kanban Board) Handoff**:
   - Provide exact 30-second setup instructions (either `gh auth refresh -s project` for CLI creation or GitHub Web UI **Projects -> New Project -> Board** with columns `Backlog`, `Ready`, `In Progress`, `In Review`, `Done` + built-in auto-move workflow).

---

## 7. Ordering & Rollout Safety

1. Create all governance files (`.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md`, updated `.github/workflows/ci.yml`, `CONTRIBUTING.md`, `AGENTS.md` addendum, and commit this design spec).
2. Run local verification (`pnpm format:check`, `pnpm lint`, `pnpm typecheck`) so the governance commit itself stays 100% clean.
3. Push to `main` and wait for all 3 parallel CI jobs (`lint-typecheck-build`, `unit-test`, `e2e`) to pass **GREEN** on GitHub Actions, verifying exact check context names.
4. Create branch `production` from the verified `main` SHA.
5. Apply GitHub repo settings, security analysis settings, labels, milestone, environments, and both Rulesets (`Protect main (Staging)` and `Protect production (Release)`).
6. Create the 3 starter Issues and verify the full GitHub configuration via `gh` read-back.

---

## 8. Engineering Calls Made by Agent (For Founder Verification)

- **Upgraded CI to full-strength 3-job parallel checks (`lint-typecheck-build`, `unit-test`, `e2e` — all Required)**: Removed `scripts/lint-changed.mjs` and the legacy lint-debt Issue because `c6be73f` already cleared all ESLint, Prettier, unit test, and E2E errors. Parallelizing drops total wall-clock CI time from ~5m15s serial to ~2.5–3m and surfaces lint/format/type failures in ~60s.
- **Drizzle path verified**: Explicitly targets `apps/api/drizzle/` and `apps/api/drizzle/meta/_journal.json`.
- **Merge method enforcement per branch**: Requested `allowed_merge_methods: ["squash"]` on `main` and `["merge"]` on `production` in Rulesets (falling back cleanly to `CONTRIBUTING.md` convention if unsupported by the Rulesets API) to prevent recurring history-drift merge conflicts when promoting `main` -> `production`.
- **Complete multi-owner `CODEOWNERS`**: Covers `/e2e/`, `/tests/`, `/scripts/`, `/package.json`, `/pnpm-lock.yaml`, and backup co-owners on `*` & root docs so no PR hits a self-approval deadlock.
- **Tracked post-hackathon Org migration**: Captured as Starter Issue #3 (`priority:p1-startup`).

---

## 9. Left to the Builder

- Exact hex colors for new GitHub labels.
- Verifying exact GitHub Rulesets REST API JSON fields before applying and falling back cleanly if `allowed_merge_methods` requires a different field/plan.
- Confirming whether GitHub Actions action versions (`@v4` vs newer Node-24-native tags if available) should stay on proven `@v4` for zero breakage risk.
