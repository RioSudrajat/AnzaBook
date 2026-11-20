## Linked Issue

Closes #

## What & Why (In Author's Own Words)

<!-- Summarize your change in 2-4 crisp bullets. Prove you read and understand every AI-assisted diff. -->

-

## Monorepo Impact

- [ ] Touches `packages/shared/` (validators, permissions, or API DTOs)
- [ ] Adds or modifies Drizzle migration under `apps/api/drizzle/` (coordinated with `@SalmanMuhammadRidwan` after rebasing onto latest `main`)
- [ ] Regenerates `apps/web/src/routeTree.gen.ts`
- [ ] Touches auth, DRM, RBAC, cookies, CORS, or secrets (tag `@luminariadev` for security review)

## Verification Evidence

- [ ] `pnpm check` passes locally (`lint` + `typecheck` + `test`)
- [ ] `pnpm format:check` passes locally
- [ ] `pnpm build` passes locally
- [ ] `pnpm test:e2e` passes locally (required for auth, routing, session, CORS, or core UI flow changes)

<!-- For apps/web UI changes, attach screenshots or a short recording below. -->

## PR Hygiene

- [ ] Scoped to a single GitHub Issue
- [ ] Kept small and reviewable (target <= ~400 logic lines excluding lockfiles and generated files)
- [ ] Follows `AGENTS.md` and `DESIGN.md` (no AI-slop defaults, proper accessibility and mobile spacing)
