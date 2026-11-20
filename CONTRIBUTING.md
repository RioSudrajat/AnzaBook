# Contributing to AnzaBook

Welcome to the **AnzaBook** engineering team. This guide covers local onboarding, GitHub task delegation, branching and release rules, monorepo conflict prevention, and AI-assisted PR standards.

---

## 1. 10-Minute Local Onboarding

### Prerequisites

- **Node.js** matching `.nvmrc` (`>= 22.12.0`)
- **pnpm** `10.x` (managed via `packageManager` in `package.json`)
- **Docker** (Docker Desktop or Docker Engine with Compose) for local and test PostgreSQL

### First-Time Setup

```bash
git clone https://github.com/RioSudrajat/AnzaBook.git
cd AnzaBook
pnpm run setup
pnpm run doctor
pnpm dev
```

- Always write `pnpm run setup` and `pnpm run doctor` (`pnpm setup` / `pnpm doctor` invoke pnpm built-ins and skip project scripts).
- `pnpm dev` starts the API on `http://localhost:4000` (`/api/health`) and the web app on `http://localhost:3000`.
- Never commit `.env.local`, credentials, or database dumps. `RioSudrajat/AnzaBook` is a **public** repository with Secret Scanning and Push Protection enabled.

---

## 2. Team Roles, Ownership & GitHub Custodian Protocol

| Member                  | GitHub                  | Role                                                   | Primary Ownership                                                                                                                                                               |
| :---------------------- | :---------------------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Selembar Awan (Rio)** | `@RioSudrajat`          | Founder, PM, Project Manager, Fullstack Lead (`admin`) | Product direction, Issue specs & priority, `packages/shared/` governance, `PRD_AnzaBook.md`, `DESIGN.md`, `AGENTS.md`, PR reviews, emergency admin bypass, **GitHub Custodian** |
| **Raka**                | `@rakaalpiansyah`       | Fullstack Dev (`write`)                                | `apps/web/` (UI, TanStack Start routes, TanStack Query hooks) and `e2e/` Playwright tests                                                                                       |
| **Salman**              | `@SalmanMuhammadRidwan` | Backend Dev (`write`)                                  | `apps/api/` (Express routes, services, Vitest tests), `tests/`, and **Drizzle migration gatekeeper** (`apps/api/src/db/`, `apps/api/drizzle/`)                                  |
| **Rizkia**              | `@luminariadev`         | DevOps & Security (`write`)                            | `.github/`, Dockerfiles, `compose.*.yaml`, `scripts/`, `docs/deployment.md`, Staging/Production infra, deploy workflows, security/DRM/RBAC auditing                             |

### GitHub Custodian Protocol (Secrets & Security Alerts)

Until AnzaBook migrates to a dedicated GitHub Organization post-hackathon, `@RioSudrajat` is the single repository `admin` on `RioSudrajat/AnzaBook`:

- `@luminariadev` designs cloud infrastructure, deployment workflows, and maintains the list of required secret **names** in Issues/docs.
- Actual secret **values** are handed off out-of-band (encrypted channel / password manager) to `@RioSudrajat`, who enters and rotates them inside GitHub Environments (`staging` and `production`).
- Never paste passwords, tokens, API keys, or `DATABASE_URL` strings into GitHub Issues, PR comments, or commits.
- `@RioSudrajat` and `@luminariadev` triage any GitHub Secret Scanning alerts together immediately.

---

## 3. Task Delegation via GitHub Issues & Projects

All work starts from a GitHub Issue. Use the structured Issue Forms (`Feature / Task Brief (AI-Ready)`, `Bug Report`, or `DevOps / Security Task`) so both engineers and their AI tools work from the same product spec.

### Kanban Flow

Track every task across 5 columns on the repository's GitHub Projects board:

1. **Backlog** — Unrefined ideas or future `priority:p1-startup` / `priority:p2-later` work.
2. **Ready** — Spec is clear (goal, acceptance criteria, target files, out-of-scope) and assigned.
3. **In Progress** — Active feature branch in development.
4. **In Review** — Pull Request opened with green CI (`lint-typecheck-build`, `unit-test`, `e2e`).
5. **Done** — Merged into `main` (auto-closed via `Closes #<issue>`).

### Labels

- **Area:** `area:api`, `area:web`, `area:shared`, `area:devops`, `area:security`
- **Priority:** `priority:p0-hackathon`, `priority:p1-startup`, `priority:p2-later`
- **Type & Flags:** `type:feature`, `bug`, `type:chore`, `db:migration`, `status:blocked`, `ai-ready`

---

## 4. Branching & Release Flow (Trunk-Based)

We use a lightweight Trunk-Based workflow designed for fast parallel shipping without merge-branch drift:

- **`main` = Staging**: Always green and continuously deployable to Staging.
- **`production` = Production**: Updated only by promoting verified commits from `main`.
- **Feature branches**: Cut from latest `main` using `feat|fix|ops|chore/<issue>-<short-slug>` (for example, `feat/14-flex-card-share` or `fix/21-reader-scroll`).

### Merge Methods (Important)

- **Feature branch -> `main`:** Always **Squash & Merge** (1 Issue = 1 clean, revertable commit). Head branches delete automatically after merge.
- **`main` -> `production`:** Always **Create a Merge Commit** (never squash `main` into `production`, or git history diverges and causes false merge conflicts on the next release). Optionally tag releases (`v0.1.0`, etc.).
- Direct pushes and force-pushes to `main` and `production` are blocked by GitHub Rulesets. Admin bypass exists strictly for `@RioSudrajat` during genuine hackathon emergencies.

---

## 5. Monorepo Conflict-Prevention Rules

### 1. Contract-First (`packages/shared/`)

When a feature spans backend (`apps/api`) and frontend (`apps/web`), agree on or merge the Zod validators and response DTOs in `packages/shared/` first. Once the contract is locked, `@SalmanMuhammadRidwan` and `@rakaalpiansyah` can implement in parallel without blocking each other.

### 2. Drizzle Migration Gate (`apps/api/drizzle/`)

Parallel schema changes cause merge conflicts in `apps/api/drizzle/meta/_journal.json`:

- Always coordinate with `@SalmanMuhammadRidwan` before running `pnpm db:generate`.
- Rebase your branch onto the latest `origin/main` immediately before generating a migration.
- Commit generated SQL files and `apps/api/drizzle/meta/` together.
- Never edit or delete an already-applied migration.

### 3. TanStack Router Route Tree (`apps/web/src/routeTree.gen.ts`)

Never hand-edit merge conflicts in `apps/web/src/routeTree.gen.ts`. Rebase onto `origin/main`, accept either version temporarily, then run `pnpm dev` or `pnpm build` so TanStack Router regenerates the file cleanly.

---

## 6. AI-Assisted PR Etiquette & Pre-PR Verification

Every team member is encouraged to use AI coding assistants (Cursor, Claude Code, Codex, Antigravity, Copilot). All repo AI instruction files (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/`) stay synced so every agent follows the same rules.

Before opening a Pull Request:

1. **One Issue, One PR:** Link `Closes #<id>` in the PR description.
2. **Keep diffs reviewable:** Target `<= ~400` logic lines (excluding lockfiles and generated files). Split large features into smaller vertical slices.
3. **Follow product & design standards:** Respect `PRD_AnzaBook.md`, `DESIGN.md`, and `AGENTS.md` (no AI-slop defaults, proper WCAG AA contrast, mobile-first spacing).
4. **Verify locally before requesting review:**

```bash
pnpm check
pnpm format:check
pnpm build
```

Run `pnpm test:e2e` as well whenever your change touches authentication, routing, session cookies, CORS, or critical UI flows.

5. **Own the code you submit:** Write the PR summary in your own words (2–4 concise bullets explaining _what_ changed and _why_). Attach screenshots or a short recording for `apps/web` UI changes.

---

## 7. Hackathon Sprint Cadence (Through 30 Nov 2026)

- **Daily async check-in (3 lines in team chat):**
  1. Yesterday: completed Issue `#...`
  2. Today: working on Issue `#...`
  3. Blockers / need review on PR `#...`
- **Fast PR reviews:** Treat open PRs as top priority so no teammate stays blocked waiting for review.
- **H-2 Feature Freeze (28 Nov 2026):** Stop merging new features two days before submission; spend 28–30 Nov strictly on bug fixes, Rizkia's `docs/deployment.md` security verification in Production, and demo rehearsals.
