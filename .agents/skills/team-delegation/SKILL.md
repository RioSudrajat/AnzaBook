---
name: team-delegation
description: >-
  Delegate tasks, triage bugs/features into AI-ready GitHub Issues, manage the
  AnzaBook Sprint & Roadmap Kanban board (GitHub Project #1), review team PRs,
  or promote main to production for RioSudrajat/AnzaBook. Use whenever the
  founder discusses team tasks, backlog breakdown, sprint status, GitHub Issues,
  Kanban cards, PR reviews, or releases.
---

# AnzaBook Team Delegation & GitHub Sprint Workflow

Read `CONTRIBUTING.md` for full team rules. Use this skill whenever delegating
work to the AnzaBook team, checking sprint status, creating AI-ready Issues,
updating the Kanban board, or coordinating releases.

## 1. Team Roster & Delegation Routing

| Member                  | GitHub                  | Owns                                                        | Route Tasks Here                                                                                                                           |
| :---------------------- | :---------------------- | :---------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Selembar Awan (Rio)** | `@RioSudrajat`          | Founder, PM, Fullstack Lead, **GitHub Custodian** (`admin`) | Product specs, `PRD_AnzaBook.md`, `DESIGN.md`, `packages/shared/` governance, PR merges, Environment Secrets entry, emergency Admin Bypass |
| **Raka**                | `@rakaalpiansyah`       | Fullstack Dev (`write`)                                     | `apps/web/` (UI, TanStack Start routes, TanStack Query hooks) and `e2e/` Playwright tests                                                  |
| **Salman**              | `@SalmanMuhammadRidwan` | Backend Dev (`write`)                                       | `apps/api/` (routes, services, Vitest), `tests/`, and **Drizzle migration gatekeeper** (`apps/api/src/db/`, `apps/api/drizzle/`)           |
| **Rizkia**              | `@luminariadev`         | DevOps & Security (`write`)                                 | `.github/`, Dockerfiles, `compose.*.yaml`, `scripts/`, `docs/deployment.md`, Staging/Prod cloud infra, DRM/RBAC/security audits            |

### Founder-First Delegation Rule

When `@RioSudrajat` raises a non-blocker bug, UI tweak, or feature idea, **default
to proposing an AI-ready GitHub Issue assigned to the appropriate teammate**
(and adding it to Kanban Project #1 under `Ready`), rather than jumping straight
into coding it solo — unless `@RioSudrajat` explicitly asks to implement it
directly in this session.

## 2. Quick Session Sync (Check Live Sprint State)

At the start of a PM/delegation session, inspect live GitHub state with:

```bash
gh issue list --repo RioSudrajat/AnzaBook
gh pr list --repo RioSudrajat/AnzaBook
gh project item-list 1 --owner RioSudrajat --format json \
  --jq '.items[] | {number: .content.number, status: .status, priority: .priority, area: .area, title: .content.title}'
```

## 3. Creating AI-Ready Issues & Adding to Kanban Project #1

Every delegated task must include: **Product Goal & Why**, **Acceptance Criteria**
(testable checkboxes), **Target Files & Shared Contracts** (Contract-First in
`packages/shared/` when FE + BE split work), **Out of Scope**, and whether a
Drizzle migration under `apps/api/drizzle/` is needed (coordinate with
`@SalmanMuhammadRidwan`).

### Live GitHub Project #1 Constants (`AnzaBook Sprint & Roadmap`)

- **URL:** `https://github.com/users/RioSudrajat/projects/1`
- **Project ID:** `PVT_kwHOCKLcDc4Bshbl`
- **Active Milestone:** `Hackathon Semifinal (30 Nov 2026)` (number `1`)
- **`Status` Field ID:** `PVTSSF_lAHOCKLcDc4BshblzhqvN_w`
  - `Backlog`: `486c405a`
  - `Ready`: `7a321ef4`
  - `In Progress`: `70eac02b`
  - `In Review`: `736ddad5`
  - `Done`: `019e9bd1`
- **`Priority` Field ID:** `PVTSSF_lAHOCKLcDc4BshblzhqvoqQ`
  - `P0 Hackathon`: `a78d6bb3`
  - `P1 Startup`: `06107e40`
  - `P2 Later`: `4dc21509`
- **`Area` Field ID:** `PVTSSF_lAHOCKLcDc4BshblzhqvoqY`
  - `Web`: `6ade92d2`
  - `API`: `fcf85094`
  - `Shared`: `aa692d45`
  - `DevOps & Security`: `80e0c745`
  - `Product / PM`: `c72aa1f8`

### Labels Reference

- **Area:** `area:api`, `area:web`, `area:shared`, `area:devops`, `area:security`
- **Priority:** `priority:p0-hackathon`, `priority:p1-startup`, `priority:p2-later`
- **Type/Flags:** `type:feature`, `bug`, `type:chore`, `db:migration`, `status:blocked`, `ai-ready`

### Procedure: Create Issue + Tag on Kanban Board

1. Create the issue with `gh issue create --repo RioSudrajat/AnzaBook --title ... --assignee ... --label ... --milestone "Hackathon Semifinal (30 Nov 2026)" --body ...`.
2. Fetch the new issue's GraphQL node ID:
   ```bash
   ISSUE_NODE_ID=$(gh issue view <NUMBER> --repo RioSudrajat/AnzaBook --json id -q .id)
   ```
3. Add it to Project #1 and set `Status`, `Priority`, and `Area` via `addProjectV2ItemById` + `updateProjectV2ItemFieldValue` using the IDs above.
4. Verify with `gh project item-list 1 --owner RioSudrajat`.

## 4. Non-Negotiable Release, CI & Security Invariants

- **Branching & Merge Methods:**
  - Feature branch (`feat|fix|ops|chore/<issue>-<slug>`) -> `main` (Staging): **Squash & Merge** (`Protect main (Staging)` ruleset `27750094`).
  - `main` -> `production` (Release): **Create a Merge Commit** (`Protect production (Release)` ruleset `27750098`) — never squash `main` into `production`.
  - `@RioSudrajat` Admin Bypass is strictly for genuine emergencies.
- **CI Concurrency:** Keep `.github/workflows/ci.yml` `cancel-in-progress` scoped to `${{ github.event_name == 'pull_request' }}` so consecutive `main`/`production` pushes never cancel each other.
- **GitHub Custodian Rule (Personal Repo):** Until post-hackathon Organization migration (Issue #3), `@luminariadev` lists secret **names** only in Issues/docs and hands actual values out-of-band to `@RioSudrajat` for GitHub Environments (`staging`, `production`). Never put credentials in Issues, PRs, or git.
- **Pre-PR Checks:** Every PR must pass `lint-typecheck-build`, `unit-test`, and `e2e` (locally: `pnpm check && pnpm format:check && pnpm build`).
