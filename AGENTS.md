# AGENTS.md - AnzaBook Guidelines & Agent Workflow

Welcome to **AnzaBook**. This repository enforces a high-standard agentic engineering methodology and a strict anti-AI-slop design aesthetic. 

Every AI coding assistant working on this codebase MUST abide by the workflows, skills, and guardrails outlined below.

---

## 1. Core Engineering Workflow (Superpowers Framework)

Follow disciplined software development methodology at all times. Do not skip phases or jump straight into code editing without structured alignment.

### Phase 1: Exploration & Alignment (`@skill:brainstorming`)
- Before writing any code, planning new features, or modifying system architecture, activate **`brainstorming`**.
- Clarify user requirements, edge cases, data structures, and trade-offs.
- Explore at least 2 distinct implementation approaches before locking in the direction.

### Phase 2: Structured Planning (`@skill:writing-plans`, `@skill:executing-plans`)
- Break down tasks into small, verifiable increments (2–5 minutes per step).
- Specify exact file paths, interfaces, and expected behavior.
- Validate each step before moving on to the next.

### Phase 3: Test-Driven Development (`@skill:test-driven-development`)
- **Strict RED-GREEN-REFACTOR cycle**:
  1. Write a failing unit or integration test first.
  2. Run the test suite to observe the failure (RED).
  3. Write the minimal amount of code necessary to make the test pass (GREEN).
  4. Refactor code for elegance and readability while keeping tests passing.
- Never write production code without accompanying tests where applicable.

### Phase 4: Systematic Debugging (`@skill:systematic-debugging`)
- When bugs or test failures occur, NEVER guess fixes or blindly edit files.
- Follow the 4-phase debugging process:
  1. **Reproduce**: Create a minimal deterministic reproduction.
  2. **Isolate**: Inspect logs, stack traces, and isolate root causes.
  3. **Hypothesize**: Formulate a clear hypothesis explaining the failure.
  4. **Verify**: Apply the fix and verify that the reproduction now passes without regressions.

### Phase 5: Verification & Review (`@skill:verification-before-completion`, `@skill:requesting-code-review`)
- **Evidence before assertions**: Run linters, type checks, and test suites. Confirm real terminal output before declaring any task complete.
- Conduct a code review against architectural standards and plan criteria.

---

## 2. Frontend & UI Design Standards (Anti-Slop Stack)

Our frontend must look **human-crafted, intentional, and distinctive**—never like a generic AI template. We leverage a 3-layer anti-slop synergy:

```
[ Layer 1: Anti-Slop (Filter) ] -> Strips out generic AI cliches & bad defaults
[ Layer 2: Taste-Skill (Art Direction) ] -> Provides award-level layout, typography & blueprints
[ Layer 3: Hallmark (Floor & Linting) ] -> Enforces hard accessibility floors & visual linting
```

### 1. Guardrail Filter (`@skill:antislop`, `@skill:antislop-ui`)
- **Strictly Prohibited AI Tells**:
  - Overused purple-to-blue / neon gradients.
  - Symmetrical 3-column feature cards with generic glow borders.
  - Oversized rounded pill buttons on every action.
  - Floating decorative shapes, meaningless icons inside rounded squares.
  - Nested cards inside cards.
- **Announcement Protocol**: Before starting any UI work, announce the active antislop mode:
  `antislop active: <strict|balanced> (project preference).`

### 2. Frontend Art Direction (`@skill:design-taste-frontend`)
- When creating or redesigning landing pages, marketing pages, or app interfaces:
  - **Declare Brief & Direction**: Infer page type, audience, vibe words, and brand constraints upfront.
  - **Typography & Scale**: Use bold, proportional font hierarchies with intentional weight contrast.
  - **Layout Blueprint**: Avoid cookie-cutter grids; use varied rhythm, asymmetrical focal points, and breathing space.
  - **App Screens vs Pages**: For dashboards/data views, prioritize visual density, clear tabular layouts, and functional tools over decorative fluff.

### 3. Hard Design Floors & Linting (`@skill:hallmark`)
- **The Floor** (Non-negotiable):
  - Every color and font must route through declared tokens or theme variables.
  - Never animate `width`, `height`, `top`, or `left`; use `transform` and `opacity`.
  - Content must remain readable and functional with `prefers-reduced-motion: reduce`.
  - The hero headline, core sentence, and primary CTA must be visible without scrolling at 1280x800.
  - Never fabricate fake user testimonials, invented metrics, or fake logo walls.
- **Verbs**:
  - Use `hallmark redesign <path>` to reskin an existing UI while preserving underlying logic and data wiring.
  - Use `hallmark audit <path>` to run a comprehensive anti-slop visual check.

---

## 3. Copywriting & Content Tone (`@skill:antislop-copywriting`)

- **Tone**: Direct, authentic, crisp, and human.
- **Forbidden Words & AI Slop Phrases**:
  - *"Supercharge", "Unleash", "Elevate", "Delve", "In today's fast-paced world", "Cutting-edge", "Seamlessly", "Game-changer"*.
- **Headlines**: Tell the user what the product actually does; avoid empty motivational slogans.
- **Buttons / CTAs**: Action-oriented and concrete (e.g., *"Open book catalog"*, *"Export data"*, rather than vague *"Get started"*).

---

## 4. Human Accessibility & Mobile Layout (`@skill:antislop-human`, `@skill:antislop-layoutmobile`)

- **Contrast**: Maintain WCAG AA standard (minimum 4.5:1 for normal text, 3:1 for large text).
- **Keyboard Navigation**: All interactive elements must show a distinct `:focus-visible` state.
- **Mobile First**:
  - Minimum touch target: 44x44px.
  - Never allow horizontal overflow (`overflow-x: clip`).
  - Container gutters must scale cleanly from mobile (16px) to desktop (32px+).

---

## 5. Code Hygiene & Comments (`@skill:antislop-code`)

- **No Obvious Comments**: Remove redundant, stating-the-obvious comments (e.g., `// Set title`, `// Return result`, `// Initialize variables`).
- **Keep High-Value Comments**: Keep explanations of non-obvious algorithms, security boundaries, edge-case workarounds, or external API quirks.
- **Clean Architecture**: Strive for self-documenting code with meaningful naming conventions and modular separation of concerns.

---

## Quick Reference: Skill Invocation Guide

| Scenario / Task | Recommended Skill / Plugin | Action |
| :--- | :--- | :--- |
| Starting a new feature or complex architecture | `@skill:brainstorming` | Clarify requirements, brainstorm trade-offs |
| Writing step-by-step implementation tasks | `@skill:writing-plans` | Create verifiable bite-sized plan |
| Implementing features or bug fixes | `@skill:test-driven-development` | RED-GREEN-REFACTOR test loop |
| Investigating unexpected bug or test failure | `@skill:systematic-debugging` | 4-phase root cause analysis |
| Building / styling web pages or landing pages | `@skill:design-taste-frontend` + `@skill:antislop-ui` | Apply art direction & strip AI cliches |
| Auditing or redesigning an existing page | `@skill:hallmark` | Run `hallmark audit` or `hallmark redesign` |
| Writing copy, marketing text, or documentation | `@skill:antislop-copywriting` | Human tone, strip marketing buzzwords |
| Reviewing code before committing / merging | `@skill:requesting-code-review` + `@skill:verification-before-completion` | Verify test suite and code quality |

---

# Build on this starter

This is the **Express + TanStack Start + PostgreSQL monorepo** of the ngodingpakeai starter family. An Express 5 API (Better Auth, Drizzle, RBAC) and a TanStack Start web app live side by side and share one TypeScript contract package. Help beginners turn a plain-language idea into a working app. Keep explanations short, explain decisions in familiar words, and implement the smallest useful feature end to end. Ask only about product decisions that materially change the work.

## First prompt: set up, then build

A request to build or run an app includes preparing its local development environment. Do this on the first feature prompt even if the user never asks about a database. For read-only questions or reviews, do not start services unnecessarily.

1. Read `README.md`, `package.json`, and `.agents/skills/starter-setup/SKILL.md`.
2. If dependencies are missing, run `pnpm run setup`. If installed, run `pnpm dev:prepare` and `pnpm run doctor`. These commands preserve existing settings and data, prepare missing secrets and origins, start managed PostgreSQL, wait for health, and apply committed migrations. Fix a reported setup problem before relying on database behavior.
3. Use the local Docker database by default when no `DATABASE_URL` is supplied. Do not ask beginners to choose a database provider, generate passwords, copy environment files, or create tables. If an existing Docker installation is stopped, start it when permitted. If a prerequisite needs user action, explain the exact action and continue work that does not depend on it.
4. Start `pnpm dev` in a persistent terminal unless it is already running. It starts both apps: the API on `BETTER_AUTH_URL` (default `http://localhost:4000`) and the web app on `WEB_URL` (default `http://localhost:3000`); each dev server takes its port from its URL. Verify both respond (`/api/health` on the API). Avoid duplicate servers.
5. Continue the user's requested feature. Setup alone does not complete a request to build an app.

Always write `pnpm run setup` and `pnpm run doctor`: `pnpm setup` and `pnpm doctor` are pnpm built-ins that ignore this project's scripts. Other scripts (`pnpm dev`, `pnpm test`, `pnpm db:migrate`, …) can be called directly.

Use the relevant skill below. Clients without skill discovery should open its file directly. `agent.md` is an alternate entrypoint to these canonical instructions.

| Task                                                   | Project skill                            |
| ------------------------------------------------------ | ---------------------------------------- |
| First app prompt or setup problem                      | `.agents/skills/starter-setup/SKILL.md`  |
| Start, inspect, stop, or troubleshoot the dev database | `.agents/skills/dev-database/SKILL.md`   |
| Build a feature, change the UI, or add data            | `.agents/skills/build-feature/SKILL.md`  |
| Create a dashboard/chatbot/other derivative            | `.agents/skills/create-variant/SKILL.md` |

## Development database

`compose.dev.yaml` runs PostgreSQL only; both apps run on the host. Use `pnpm db:up`, `db:status`, `db:logs`, and `db:down` so private environment settings and the saved Compose project name are loaded. Fresh setup chooses a free database port, generates credentials, and stores data in a persistent named volume. `db:down` keeps that volume. Preserve `.env.local` and never run volume deletion or destructive resets to repair setup. Supplied external connections bypass Docker. See `docs/local-development.md`.

## Current documentation with Context7

For library, framework, SDK, API, CLI, or cloud-service syntax, configuration, setup, migrations, or library-specific debugging, use Context7 even when the API seems familiar. Do not use it for pure business logic, general programming, or code review without an API question.

1. Call `resolve-library-id` with the library's official name and the actual question, unless the user supplied an exact Context7 library ID.
2. Select the official project or authoritative docs by relevance, reputation, coverage, and installed version. Refine a mismatched search.
3. Call `query-docs` with the resolved ID and a focused question. Use separate queries for unrelated concepts and observe the tool's call limits.
4. Check the examples against the installed version. If Context7 is unavailable, say so, use official documentation, and continue work that does not depend on the missing answer. Do not claim a connection was tested just because its config exists.

Project-scoped MCP files for Codex, Claude Code, Cursor, and VS Code are included. See `docs/ai-workflow.md`. Never put credentials into prompts or committed MCP files.

## Code map and boundaries

```text
apps/api        Express 5 API: Better Auth, Drizzle/PostgreSQL, routes → services
apps/web        TanStack Start web app: pages, Better Auth client, TanStack Query hooks
packages/shared validators (zod), permissions (RBAC), API DTO types, site identity
```

**API (`apps/api/src`)**

- `app.ts` builds the Express app (middleware order matters — read the comments); `server.ts` listens and shuts down gracefully. `pnpm dev` restarts the API on every change (`tsx watch`, including `packages/shared` and `.env.local`).
- `routes/*.routes.ts`: thin HTTP handlers. Mount `requireAuth` then `requireTrustedOrigin` on each router; add `requirePermission(...)` for cross-account endpoints; use `jsonBody` on POST/PATCH. Register routers in `routes/index.ts`.
- `services/*.service.ts`: all application logic and Drizzle queries. Receive the verified user ID as an argument; filter ownership in SQL. Name cross-account functions with an `Any` suffix and call them only behind `requirePermission`.
- `db/schema/<table>.ts` (export from `db/schema/index.ts`), `drizzle/` (committed migrations), `db/index.ts` (shared pool).
- `lib/auth.ts` (Better Auth server), `lib/logger.ts` (pino), `lib/request-context.ts` (AsyncLocalStorage reqId/userId), `middleware/` (auth, origin, body, errors).
- Express 5 forwards rejected promises to the error handler: throw `HttpError` or let Zod throw; never `res.status(500)` by hand.

**Web (`apps/web/src`)**

- `routes/`: TanStack Start file routes. `_auth/` = sign-in/up, `_protected/` = signed-in screens (the layout's `beforeLoad` redirects anonymous visitors). Pages render on the server first, then hydrate; any component may use hooks. `routeTree.gen.ts` is generated and committed.
- `lib/auth-client.ts`: Better Auth browser client pointed at the API origin with `credentials: "include"`.
- `lib/auth.middleware.ts` + `lib/session.ts`: server function middleware that reads the visitor's session from the API by forwarding their cookie; the root route stores it in router context.
- `lib/api/client.ts`: `apiFetch` + `ApiError`. Isomorphic: in the browser it calls `VITE_API_URL` with cookies; during SSR it calls `API_INTERNAL_URL` forwarding the cookie and request ID.
- `features/<feature>/api.ts` (one function per endpoint) → `queries.ts` (query keys + `queryOptions`) → `hooks.ts` (custom hooks: `useX`, `useCreateX`, …). Components use hooks only. Route loaders call `context.queryClient.ensureQueryData(xQuery(...))` so SSR renders data.
- Files ending in `.server.ts` are server-only; TanStack Start import protection fails the build if browser code imports one. Reach them via `createServerFn`, `createMiddleware().server()`, or the `.server()` branch of `createIsomorphicFn` — and keep server-only names out of `.client()` branches, even in types.
- `components/ui`: owned shadcn/ui primitives (`npx shadcn@4.21.0 add <component>` from `apps/web`). `styles/globals.css`: Tailwind v4 tokens. Motion from `motion/react`; respect reduced motion.

**Shared (`packages/shared/src`)**: `validators/` (strict zod input schemas, used by API handlers and typed by web forms), `permissions.ts` (statement, roles, `roleHasPermission`), `types/api.ts` (response DTOs with ISO-string dates), `site.ts` (identity from `starter.config.json`). Keep it free of Node-only or browser-only code.

## Security rules

Authenticate at every API boundary: `requireAuth` answers JSON 401. The web app's layout guard is presentation, not authorization. Filter every user-owned read/update/delete by the verified session's user ID; never trust a submitted owner ID. Validate bodies, IDs, and pagination with strict shared schemas before services run.

The browser calls the API cross-origin with cookies. CORS and Better Auth `trustedOrigins` allow exactly `WEB_URL` (plus `TRUSTED_ORIGINS`). Every cookie-authenticated mutation, including DELETE, must pass `requireTrustedOrigin`. Session cookies reach the web server because both apps share a host locally (cookies ignore ports) and a parent `COOKIE_DOMAIN` in production — keep `BETTER_AUTH_URL`, `WEB_URL`, and `VITE_API_URL` consistent (`pnpm run doctor` checks).

Authorize separately from authentication when a feature reaches past the caller's own rows. Declare the resource and actions in `packages/shared/src/permissions.ts`, guard the API route with `requirePermission`, and guard the page with `roleHasPermission(session.user.role, …)` in `beforeLoad` (throw `notFound()`). Roles come from `user.role`, which signup cannot set; use `pnpm role:set <email> <role>`. Hiding UI is never the access check.

Keep secrets server-side; only `VITE_*` values reach the browser, and `VITE_API_URL` is the only one. Validate new API settings in `apps/api/src/config/env.ts`. Never log cookies, passwords, tokens, or connection strings — the pino loggers redact the common fields; do not log request bodies. Encode IDs placed in API paths with `encodeURIComponent`.

Request bodies are capped at 100 kB, including Better Auth's (`limitAuthBody`). Better Auth rate limits are on outside the API tests; `TRUST_PROXY=true` is refused. The web app sets framing, nosniff, and referrer headers (HSTS in production) in `apps/web/src/start.ts`. Before production, walk through the security checklist in `docs/deployment.md`.

## Adding a resource end to end

Follow the Notes example (`docs/backend.md`, `docs/frontend.md`):

1. Table: `apps/api/src/db/schema/<table>.ts`, export from `index.ts`, `pnpm db:generate`, inspect the SQL, `pnpm db:migrate`. Commit SQL and `drizzle/meta` together. Never rewrite applied migrations or reset to fix errors.
2. Contract: strict zod schemas in `packages/shared/src/validators/<resource>.ts` and DTO types in `packages/shared/src/types/api.ts`; add the subpath to `packages/shared/package.json` `exports`.
3. API: `services/<resource>.service.ts`, `routes/<resource>.routes.ts`, register in `routes/index.ts`; tests in `apps/api/src/test/`.
4. Web: `features/<resource>/{api,queries,hooks}.ts`, components, and a page under `routes/_protected/` with a loader that ensures the query.

Use PostgreSQL `pgTable`/boolean/timestamp-with-time-zone columns and asynchronous queries. Never substitute SQLite syntax or disable TLS verification.

## Verify and hand off

Run `pnpm check` (lint, typecheck, API + root tests on disposable PostgreSQL) and `pnpm build` for substantive changes. For auth/routing/session/CORS changes also run `pnpm test:e2e` (production builds + Playwright). For setup or Compose changes run `pnpm test:setup`. Add tests for real behavior and data isolation. Review the UI at narrow and wide widths when changing layout. Once the app has a real first screen, the starter placeholder (`data-starter-placeholder` in `apps/web/src/routes/_protected/app.tsx`) and `e2e/starter.spec.ts` must be gone; `pnpm run doctor` reminds you while they remain.

Report the result, how to use it, checks run, and any remaining limitation. Keep dashboard-specific, chatbot-specific, billing, and provider-specific features in derivatives unless the user asks to add them to this base. Do not deploy, purchase services, or choose an AI provider just because this is an AI-friendly starter.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
