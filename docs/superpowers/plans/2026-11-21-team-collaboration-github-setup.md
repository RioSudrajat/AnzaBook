# Team Collaboration, GitHub Governance & Environment Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out AnzaBook's GitHub-native team collaboration workflow, AI-ready issue/PR templates, multi-owner `CODEOWNERS`, parallel 3-job CI pipeline, `main`/`production` branches, GitHub Environments, Rulesets with Founder admin bypass, structured labels/milestone, and 3 kickoff Issues.

**Architecture:** Commit all repository governance files and the upgraded parallel CI workflow onto `main` first so GitHub Actions verifies all 3 required check contexts (`lint-typecheck-build`, `unit-test`, `e2e`) green and validates `.github/CODEOWNERS` with zero errors. Once verified, branch `production` from that green commit, apply GitHub repository settings, environments, labels, milestone, and branch Rulesets via `gh api`, and seed the 3 starter Issues.

**Tech Stack:** GitHub Actions, GitHub Rulesets & Environments REST API (`gh` CLI), Prettier, ESLint, pnpm + Turborepo monorepo (`@starter/api`, `@starter/web`, `@starter/shared`), PostgreSQL/Docker test harness, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-team-collaboration-github-setup-design.md`

## Global Constraints

- Target repo stays personal `PUBLIC` repo `RioSudrajat/AnzaBook` through 30 Nov 2026 (Decision `1B`); `@RioSudrajat` (ID `144890893`) is GitHub Custodian for Repository Settings, Environment Secrets, and Secret Scanning alerts.
- Team handles: `@RioSudrajat` (`admin`), `@rakaalpiansyah` (`write`), `@SalmanMuhammadRidwan` (`write`), `@luminariadev` (`write`, ID `114386052`).
- Branching model (Option A): `main` = Staging (Squash PRs from `feat|fix|ops|chore/<issue>-<slug>`), `production` = Release (Merge-commit PRs from `main` to preserve ancestry).
- Every `.github/CODEOWNERS` path rule must list at least 2 owners (Decision `3A`) so routine PRs never hit a self-approval deadlock.
- Admin bypass (`RepositoryRole`, `actor_id: 5`, `bypass_mode: "always"`) enabled for `@RioSudrajat` on both `main` and `production` rulesets.
- Drizzle migrations live in `apps/api/drizzle/` (with `apps/api/drizzle/meta/_journal.json`), NOT `apps/api/src/db/drizzle/`.
- Prettier checks `.github/**/*.yml`, `.md` files, and `docs/superpowers/**` (none are in `.prettierignore`); every created/edited file must pass `pnpm format:check`.
- Never commit secrets or `.env.local`; never mention secret values in Issues, PRs, or docs.

## Review Focus

- **Prettier/YAML breakage in governance files:** Unformatted Markdown or malformed YAML in `.github/` fails `lint-typecheck-build` immediately on push -> pinned in Task 1 & Task 2 (`pnpm format:check` + YAML structural validation).
- **Silent `CODEOWNERS` parse errors or bad handles:** Invalid path/username syntax in `.github/CODEOWNERS` silently disables review routing -> pinned in Task 3 (`gh api repos/RioSudrajat/AnzaBook/codeowners/errors` must return `{"errors":[]}`).
- **Required status check context name drift:** If Ruleset `context` strings do not match the exact check-run names emitted by `.github/workflows/ci.yml`, PRs stall indefinitely waiting for checks -> pinned in Task 3 & Task 5 (read exact check-run names from the live green run before creating Rulesets).
- **Rulesets API `allowed_merge_methods` compatibility:** If GitHub's Rulesets API rejects `allowed_merge_methods` on this repo plan, Ruleset creation could error out and leave `main`/`production` unprotected -> pinned in Task 5 (inspect API response, retry cleanly without `allowed_merge_methods` if rejected, and verify both Rulesets exist with `enforcement: "active"`).
- **Premature branch/ruleset ordering:** Creating `production` or enabling Rulesets before the split CI workflow runs green on `main` risks blocking rollout or creating stale branch ancestry -> pinned by strict task ordering (Task 3 green CI -> Task 4 `production` branch -> Task 5 Rulesets).

---

## File Structure

- Create: `.github/CODEOWNERS` — Multi-owner review routing across all repo paths.
- Create: `.github/ISSUE_TEMPLATE/config.yml` — Disables blank issues; links `CONTRIBUTING.md` and `PRD_AnzaBook.md`.
- Create: `.github/ISSUE_TEMPLATE/feature-task.yml` — AI-ready feature/task delegation form.
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml` — Structured bug report form.
- Create: `.github/ISSUE_TEMPLATE/devops-security.yml` — DevOps & security task form with secret-name-only handoff guidance.
- Create: `.github/PULL_REQUEST_TEMPLATE.md` — AI-era PR summary, monorepo impact checklist, and verification evidence.
- Create: `CONTRIBUTING.md` — 10-minute team onboarding, roles, Opsi A branching, monorepo conflict rules, AI PR etiquette, and hackathon cadence.
- Modify: `AGENTS.md` — Add `## 6. Team Collaboration & Git Workflow` after line 119.
- Modify: `.github/workflows/ci.yml` — Replace serial single job with 3 parallel required jobs (`lint-typecheck-build`, `unit-test`, `e2e`) + concurrency cancellation.

---

### Task 1: Create `.github/CODEOWNERS`, Issue Forms, and PR Template

**Files:**

- Create: `.github/CODEOWNERS`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/ISSUE_TEMPLATE/feature-task.yml`
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/devops-security.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

**Interfaces:**

- Produces: GitHub review-routing rules (`.github/CODEOWNERS`), YAML Issue Forms (referencing labels created in Task 4: `type:feature`, `ai-ready`, `bug`, `area:devops`, `area:security`), and PR checklist template.

- [ ] **Step 1: Create `.github/CODEOWNERS` with exact multi-owner mapping from Spec Section 6 Part A.1**

  Write every path rule from the spec (`*`, `/PRD_AnzaBook.md`, `/DESIGN.md`, `/AGENTS.md`, `/CONTRIBUTING.md`, `/packages/shared/`, `/package.json`, `/pnpm-lock.yaml`, `/apps/api/`, `/apps/api/src/db/`, `/apps/api/drizzle/`, `/tests/`, `/apps/web/`, `/e2e/`, `/.github/`, `/scripts/`, Dockerfiles, compose files, `/docs/deployment.md`) with at least 2 owners per line.

- [ ] **Step 2: Create `.github/ISSUE_TEMPLATE/config.yml` and the 3 YAML Issue Forms**

  - `config.yml`: `blank_issues_enabled: false`, `contact_links` pointing to `CONTRIBUTING.md` and `PRD_AnzaBook.md` on `https://github.com/RioSudrajat/AnzaBook/blob/main/...`.
  - `feature-task.yml`: `labels: ["type:feature", "ai-ready"]`; inputs for Product Goal & Why (`textarea`, required), Target Area (`dropdown`: `apps/web`, `apps/api`, `packages/shared`, `Fullstack`, required), Priority (`dropdown`: `priority:p0-hackathon`, `priority:p1-startup`, `priority:p2-later`, required), Acceptance Criteria (`textarea`, required), Target Files & Shared Contracts (`textarea`, optional), Out of Scope (`textarea`, required), Requires Drizzle DB Migration (`dropdown`: `No`, `Yes — coordinate with @SalmanMuhammadRidwan before pnpm db:generate`, required).
  - `bug-report.yml`: `labels: ["bug"]`; inputs for Summary, Reproduction Steps, Expected vs Actual, Area (`dropdown`), Severity (`dropdown`), Logs/Screenshots.
  - `devops-security.yml`: `labels: ["area:devops", "area:security"]`; inputs for Environment (`dropdown`: `staging`, `production`, `ci`, `both`), Objective & Scope, Security/Deployment Checklist (`textarea` referencing `docs/deployment.md`), Secret Names Needed (`textarea` explicitly instructing: list secret **names** only — hand values out-of-band to `@RioSudrajat` as GitHub Custodian, never paste secrets here), Verification & Rollback Plan.

- [ ] **Step 3: Create `.github/PULL_REQUEST_TEMPLATE.md`**

  Include sections pinned by Spec Section 6 Part A.3: `Closes #`, What & Why in author's own words, Monorepo Impact checkboxes (`packages/shared/`, `apps/api/drizzle/` coordinated with `@SalmanMuhammadRidwan`, `apps/web/src/routeTree.gen.ts`, auth/DRM/RBAC/cookies/CORS tagging `@luminariadev`), Verification Evidence (`pnpm check`, `pnpm format:check`, `pnpm build`, optional `pnpm test:e2e`, UI screenshot/recording), and PR Hygiene checklist (`<= ~400` logic lines, `AGENTS.md`, `DESIGN.md`).

- [ ] **Step 4: Validate YAML syntax and Prettier formatting on all Task 1 files**

  Run:

  ```bash
  pnpm exec prettier --write .github/ISSUE_TEMPLATE/*.yml .github/PULL_REQUEST_TEMPLATE.md
  pnpm exec prettier --check .github/ISSUE_TEMPLATE/*.yml .github/PULL_REQUEST_TEMPLATE.md
  node -e 'const fs=require("fs"); for (const f of [".github/CODEOWNERS",".github/ISSUE_TEMPLATE/config.yml",".github/ISSUE_TEMPLATE/feature-task.yml",".github/ISSUE_TEMPLATE/bug-report.yml",".github/ISSUE_TEMPLATE/devops-security.yml",".github/PULL_REQUEST_TEMPLATE.md"]) { const c=fs.readFileSync(f,"utf8"); if (!c.trim()) throw new Error("Empty: "+f); } console.log("All 6 governance template files present and non-empty");'
  ```

  Verify every `.github/CODEOWNERS` non-comment line has at least two `@` handles:

  ```bash
  node -e 'const lines=require("fs").readFileSync(".github/CODEOWNERS","utf8").split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")); for (const l of lines) { const owners=l.split(/\s+/).slice(1).filter(t=>t.startsWith("@")); if (owners.length<2) throw new Error("Single-owner rule: "+l); } console.log("Verified", lines.length, "multi-owner CODEOWNERS rules");'
  ```

  Expected: Prettier exits `0`, all 6 files verified non-empty, all `CODEOWNERS` lines pass `>= 2` owners check.

- [ ] **Step 5: Commit Task 1**

  ```bash
  git add .github/CODEOWNERS .github/ISSUE_TEMPLATE .github/PULL_REQUEST_TEMPLATE.md
  git commit -m "chore(github): add multi-owner CODEOWNERS, AI-ready issue forms, and PR template"
  ```

---

### Task 2: Create `CONTRIBUTING.md` and Add Team Workflow Section to `AGENTS.md`

**Files:**

- Create: `CONTRIBUTING.md`
- Modify: `AGENTS.md:114-125`

**Interfaces:**

- Consumes: Team roster, `CODEOWNERS` boundaries, and Issue/PR templates from Task 1; CI job names (`lint-typecheck-build`, `unit-test`, `e2e`) defined in Task 3.
- Produces: Canonical human onboarding guide (`CONTRIBUTING.md`) and AI-agent team workflow addendum in `AGENTS.md`.

- [ ] **Step 1: Create `CONTRIBUTING.md`**

  Cover all sections pinned in Spec Section 6 Part A.5 in crisp, human, anti-slop prose (Indonesian or clear bilingual technical English matching repo docs — keep clean English matching `README.md`/`AGENTS.md`/`docs/*.md` so AI tools and contributors share one vocabulary):
  1. **10-Minute Local Onboarding**: prerequisites (Node per `.nvmrc`, pnpm, Docker), `pnpm run setup`, `pnpm run doctor`, `pnpm dev` (`:3000` web / `:4000` API), note about `pnpm run setup` vs built-in `pnpm setup`.
  2. **Team Roles, Ownership & GitHub Custodian Protocol**: exact table of `@RioSudrajat`, `@rakaalpiansyah`, `@SalmanMuhammadRidwan`, `@luminariadev`; explicit secret-handoff rule (`@luminariadev` lists required secret names and hands values out-of-band to `@RioSudrajat`; zero secrets in git/Issues/PRs).
  3. **Task Delegation via GitHub Issues & Projects**: 5-column Kanban (`Backlog` -> `Ready` -> `In Progress` -> `In Review` -> `Done`), 1 Issue = 1 Branch = 1 PR (`Closes #`), AI-Ready brief expectations.
  4. **Branching & Release Flow (Trunk-Based Option A)**:
     - Feature branches: `feat|fix|ops|chore/<issue>-<slug>` -> **Squash & Merge** PR to `main` (Staging).
     - Production promotion: **Merge-commit** PR from `main` -> `production` (never squash `main` -> `production` to avoid recurring merge conflicts), optional release tag `v0.x.y`.
     - Admin bypass reserved for `@RioSudrajat` genuine hackathon emergencies only.
  5. **Monorepo Conflict-Prevention Rules**:
     - Contract-First in `packages/shared/` before splitting `apps/api` and `apps/web`.
     - Drizzle Migration Gate: coordinate with `@SalmanMuhammadRidwan` before `pnpm db:generate`, rebase onto latest `main` first so `apps/api/drizzle/meta/_journal.json` stays linear, never edit applied migrations.
     - `apps/web/src/routeTree.gen.ts`: never hand-edit merge conflicts; rebase onto `main` and regenerate via Vite/TanStack Router (`pnpm dev` or `pnpm build`).
  6. **AI-Assisted PR Etiquette & Pre-PR Verification**: start from a GitHub Issue, follow `AGENTS.md` and `DESIGN.md`, keep PRs small (`<= ~400` logic lines), run `pnpm check && pnpm format:check && pnpm build` locally (plus `pnpm test:e2e` for UI/auth/routing changes), explain the diff in your own words.
  7. **Hackathon Sprint Cadence (to 30 Nov 2026)**: daily 3-line async check-in (done Issue #, today's Issue #, blockers), fast PR review turnaround, H-2 feature freeze on 28 Nov.

- [ ] **Step 2: Add `## 6. Team Collaboration & Git Workflow` to `AGENTS.md`**

  Insert between line 119 (end of `## 5. Code Hygiene & Comments`) and line 122 (`## Quick Reference: Skill Invocation Guide`) a concise section directing all team AI assistants to:
  - Read `CONTRIBUTING.md` for team ownership and git rules.
  - Always work on a scoped branch (`feat|fix|ops|chore/<issue>-<slug>`); never commit or push directly to `main` or `production`.
  - Keep each PR tied to one GitHub Issue (`Closes #<id>`) and focused (`<= ~400` logic lines where practical).
  - Coordinate with `@SalmanMuhammadRidwan` before generating migrations in `apps/api/drizzle/` and rebase onto latest `main` first.
  - Never hand-resolve conflicts in `apps/web/src/routeTree.gen.ts`; regenerate after rebasing.
  - Run `pnpm check && pnpm format:check && pnpm build` before opening a PR (plus `pnpm test:e2e` when changing auth, routing, or critical UI flows).

- [ ] **Step 3: Format and verify `CONTRIBUTING.md`, `AGENTS.md`, and docs**

  Run:

  ```bash
  pnpm exec prettier --write CONTRIBUTING.md AGENTS.md docs/superpowers/specs/2026-11-20-team-collaboration-github-setup-design.md docs/superpowers/plans/2026-11-21-team-collaboration-github-setup.md
  pnpm format:check
  ```

  Expected: `All matched files use Prettier code style!` (exit code `0`).

- [ ] **Step 4: Commit Task 2 (including spec & plan docs)**

  ```bash
  git add CONTRIBUTING.md AGENTS.md docs/superpowers/specs/2026-11-20-team-collaboration-github-setup-design.md docs/superpowers/plans/2026-11-21-team-collaboration-github-setup.md
  git commit -m "docs: add CONTRIBUTING guide, AGENTS team workflow, and collaboration setup spec/plan"
  ```

---

### Task 3: Parallelize `.github/workflows/ci.yml`, Push to `main`, and Verify Green CI + `CODEOWNERS`

**Files:**

- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Produces: Live GitHub Actions check contexts named exactly `lint-typecheck-build`, `unit-test`, and `e2e` (consumed by Rulesets in Task 5), and a verified green `main` HEAD SHA (consumed by `production` branch creation in Task 4).

- [ ] **Step 1: Rewrite `.github/workflows/ci.yml` with 3 parallel jobs and concurrency cancellation**

  Exact structure:
  - `name: AnzaBook CI`
  - `on:`: `push: { branches: [main, production] }` and `pull_request: { branches: [main, production] }`
  - `concurrency:`: `group: ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`
  - `permissions:`: `contents: read`
  - Shared setup steps per job: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4` (`node-version-file: .nvmrc`, `cache: pnpm`), `pnpm install --frozen-lockfile`.
  - Job `lint-typecheck-build` (`name: lint-typecheck-build`, `runs-on: ubuntu-latest`): runs `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
  - Job `unit-test` (`name: unit-test`, `runs-on: ubuntu-latest`): runs `pnpm test`.
  - Job `e2e` (`name: e2e`, `runs-on: ubuntu-latest`): runs `pnpm exec playwright install --with-deps chromium`, `pnpm test:e2e`, and uploads `test-results/` artifact on `if: failure()` (`retention-days: 7`).

- [ ] **Step 2: Format and run local pre-push verification**

  Run:

  ```bash
  pnpm exec prettier --write .github/workflows/ci.yml
  pnpm lint && pnpm format:check && pnpm typecheck && pnpm build
  ```

  Expected: All 4 commands exit `0` with zero errors.

- [ ] **Step 3: Commit CI workflow and push `main` to `origin`**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: parallelize lint-typecheck-build, unit-test, and e2e jobs with concurrency"
  git push origin main
  ```

- [ ] **Step 4: Watch live GitHub Actions run and verify exact check-run names + `CODEOWNERS` validity**

  Run:

  ```bash
  HEAD_SHA=$(git rev-parse HEAD)
  gh run list --repo RioSudrajat/AnzaBook --commit "$HEAD_SHA" --limit 1
  RUN_ID=$(gh run list --repo RioSudrajat/AnzaBook --commit "$HEAD_SHA" --limit 1 --json databaseId -q '.[0].databaseId')
  gh run watch "$RUN_ID" --repo RioSudrajat/AnzaBook --exit-status
  gh api "repos/RioSudrajat/AnzaBook/commits/$HEAD_SHA/check-runs" --jq '.check_runs[] | "\(.name): \(.conclusion)"'
  gh api repos/RioSudrajat/AnzaBook/codeowners/errors
  ```

  Expected:
  - `gh run watch` exits `0`.
  - Check-runs report exactly:
    - `lint-typecheck-build: success`
    - `unit-test: success`
    - `e2e: success`
  - `codeowners/errors` returns `{"errors":[]}` (empty list).

---

### Task 4: Create `production` Branch, Configure Repo Settings, Security, Labels, Milestone & Environments

**Files:**

- None (GitHub remote state via `git` and `gh` CLI).

**Interfaces:**

- Consumes: Verified green `main` HEAD SHA from Task 3; GitHub user IDs `RioSudrajat=144890893`, `luminariadev=114386052`.
- Produces: Remote `production` branch, configured repo merge/delete settings, team labels, Hackathon milestone (milestone number consumed by Task 5), and `staging`/`production` GitHub Environments.

- [ ] **Step 1: Create and push `production` branch from verified `main`**

  ```bash
  git branch production main
  git push -u origin production
  ```

  Expected: `origin/production` points to the exact same verified green SHA as `origin/main`.

- [ ] **Step 2: Apply repository merge & branch-hygiene settings and confirm security settings**

  ```bash
  gh api -X PATCH repos/RioSudrajat/AnzaBook \
    -F allow_squash_merge=true \
    -F allow_merge_commit=true \
    -F allow_rebase_merge=false \
    -F delete_branch_on_merge=true
  gh api repos/RioSudrajat/AnzaBook --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,delete_branch_on_merge,security_and_analysis}'
  ```

  Expected: `allow_squash_merge: true`, `allow_merge_commit: true`, `allow_rebase_merge: false`, `delete_branch_on_merge: true`, and `secret_scanning` + `secret_scanning_push_protection` both `"enabled"`.

- [ ] **Step 3: Create structured team labels (idempotent with `--force`)**

  Create/update:
  - Areas: `area:api` (`#0e8a16`), `area:web` (`#1d76db`), `area:shared` (`#5319e7`), `area:devops` (`#fbca04`), `area:security` (`#b60205`)
  - Priorities: `priority:p0-hackathon` (`#d93f0b`), `priority:p1-startup` (`#f9d0c4`), `priority:p2-later` (`#c5def5`)
  - Types/Flags: `type:feature` (`#0075ca`), `type:chore` (`#bfdadc`), `db:migration` (`#e99695`), `status:blocked` (`#b60205`), `ai-ready` (`#006b75`)
    Verify via `gh label list --repo RioSudrajat/AnzaBook --limit 50`.

- [ ] **Step 4: Create Milestone `Hackathon Semifinal (30 Nov 2026)`**

  ```bash
  gh api -X POST repos/RioSudrajat/AnzaBook/milestones \
    -f title="Hackathon Semifinal (30 Nov 2026)" \
    -f state="open" \
    -f description="Semifinal hackathon submission & proof-of-idea launch milestone for AnzaBook." \
    -f due_on="2026-11-30T23:59:59Z"
  ```

  Verify milestone number (`1`) and `due_on` via `gh api repos/RioSudrajat/AnzaBook/milestones`.

- [ ] **Step 5: Create GitHub Environments `staging` and `production` with branch policies and reviewers**

  - `staging`: PUT `repos/RioSudrajat/AnzaBook/environments/staging` with `deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }`, then POST custom branch policy `name: "main"`.
  - `production`: PUT `repos/RioSudrajat/AnzaBook/environments/production` with `reviewers: [{ type: "User", id: 144890893 }, { type: "User", id: 114386052 }]` and `deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }`, then POST custom branch policy `name: "production"`.
  - Verify both environments and their branch policies via `gh api repos/RioSudrajat/AnzaBook/environments`.

---

### Task 5: Apply Branch Rulesets, Seed 3 Starter Issues, and Run Full Verification Audit

**Files:**

- None (GitHub remote state via `gh` CLI).

**Interfaces:**

- Consumes: Exact verified CI check-run names from Task 3 (`lint-typecheck-build`, `unit-test`, `e2e`); `production` branch, labels, and Milestone from Task 4.
- Produces: Active GitHub Rulesets on `main` and `production`, 3 kickoff Issues assigned to the team, and verified read-back evidence.

- [ ] **Step 1: Create Ruleset `Protect main (Staging)`**

  POST `repos/RioSudrajat/AnzaBook/rulesets`:
  - `name: "Protect main (Staging)"`, `target: "branch"`, `enforcement: "active"`
  - `conditions.ref_name.include: ["refs/heads/main"]`, `exclude: []`
  - `bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always" }]`
  - `rules`:
    - `{ type: "deletion" }`
    - `{ type: "non_fast_forward" }`
    - `{ type: "pull_request", parameters: { required_approving_review_count: 1, dismiss_stale_reviews_on_push: true, require_code_owner_review: true, require_last_push_approval: false, required_review_thread_resolution: false, allowed_merge_methods: ["squash"] } }` _(if API rejects `allowed_merge_methods`, retry cleanly without that single field and note convention in report)_
    - `{ type: "required_status_checks", parameters: { strict_required_status_checks_policy: false, required_status_checks: [{ context: "lint-typecheck-build" }, { context: "unit-test" }, { context: "e2e" }] } }`

- [ ] **Step 2: Create Ruleset `Protect production (Release)`**

  POST `repos/RioSudrajat/AnzaBook/rulesets`:
  - `name: "Protect production (Release)"`, `target: "branch"`, `enforcement: "active"`
  - `conditions.ref_name.include: ["refs/heads/production"]`, `exclude: []`
  - `bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always" }]`
  - `rules`:
    - `{ type: "deletion" }`
    - `{ type: "non_fast_forward" }`
    - `{ type: "pull_request", parameters: { required_approving_review_count: 1, dismiss_stale_reviews_on_push: true, require_code_owner_review: false, require_last_push_approval: false, required_review_thread_resolution: false, allowed_merge_methods: ["merge"] } }` _(same graceful fallback if `allowed_merge_methods` rejected)_
    - `{ type: "required_status_checks", parameters: { strict_required_status_checks_policy: false, required_status_checks: [{ context: "lint-typecheck-build" }, { context: "unit-test" }, { context: "e2e" }] } }`

- [ ] **Step 3: Create the 3 Starter Issues**

  1. **Issue #1** — Assignee: `luminariadev`, Labels: `area:devops,area:security,priority:p0-hackathon`, Milestone: `Hackathon Semifinal (30 Nov 2026)`
     - Title: `[Ops/Sec] Setup Staging & Production deployment, shared COOKIE_DOMAIN, and security checklist`
     - Body: Concrete checklist covering hosting choice, Staging (`main`) & Production (`production`) deployments using `apps/api/Dockerfile` & `apps/web/Dockerfile`, shared parent domain `COOKIE_DOMAIN` + `TRUST_PROXY`, delivering the required secret **names** (and out-of-band values) to `@RioSudrajat` as GitHub Custodian for GitHub Environments, and auditing the `docs/deployment.md` security checklist + DRM/RBAC boundaries.
  2. **Issue #2** — Assignee: `RioSudrajat`, Labels: `priority:p0-hackathon,ai-ready`, Milestone: `Hackathon Semifinal (30 Nov 2026)`
     - Title: `[PM] Lock Hackathon 30 Nov demo scope, create GitHub Projects Kanban board, and seed P0 tasks for Raka & Salman`
     - Body: Checklist for 45-min kickoff call, 30-second GitHub Projects Kanban board creation (`Backlog`, `Ready`, `In Progress`, `In Review`, `Done`), locking P0 demo features vs deferred items, and opening AI-ready Issues for `@rakaalpiansyah` and `@SalmanMuhammadRidwan`.
  3. **Issue #3** — Assignee: `RioSudrajat`, Labels: `area:devops,priority:p1-startup`
     - Title: `[Post-Hackathon] Migrate AnzaBook repository to a GitHub Organization`
     - Body: Post-30 Nov migration checklist so `@luminariadev` receives native repository admin / GitHub Environment Secrets / Secret Scanning alerts permissions, plus narrowing Ruleset bypass from `RepositoryRole: Admin` to Founder-specific team/user after migration.

- [ ] **Step 4: Run complete end-to-end verification read-back**

  Run:

  ```bash
  git status -sb
  gh api repos/RioSudrajat/AnzaBook/rulesets --jq '.[] | {id, name, enforcement}'
  gh api repos/RioSudrajat/AnzaBook/environments --jq '.environments[] | {name, protection_rules}'
  gh api repos/RioSudrajat/AnzaBook/branches --jq '.[].name'
  gh api repos/RioSudrajat/AnzaBook/milestones --jq '.[] | {number, title, due_on, open_issues}'
  gh issue list --repo RioSudrajat/AnzaBook
  gh run list --repo RioSudrajat/AnzaBook --limit 3
  ```

  Expected:
  - Clean working tree on `main`.
  - Both Rulesets active (`Protect main (Staging)` and `Protect production (Release)`).
  - Both Environments configured (`staging` and `production`).
  - Both Branches present (`main`, `production`).
  - Milestone `Hackathon Semifinal (30 Nov 2026)` active with 2 P0 issues attached, and 3 starter issues total listed cleanly.
  - Latest CI runs on `main` (and `production` if triggered) GREEN.
