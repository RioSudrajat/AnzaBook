# Starter Technical Reference

This document preserves the architectural reference and technical patterns of the underlying **Express 5 + TanStack Start + PostgreSQL monorepo** starter powering AnzaBook. AI agents and contributors can reference this document for low-level monorepo conventions and starter internals.

---

## 1. System Overview

A full-stack monorepo sharing a single TypeScript contract:

- **API (`apps/api`)**: Express 5 + TypeScript, Better Auth (server), Drizzle ORM, PostgreSQL pool (`pg`), role-based access control (RBAC), thin route handlers with shared zod validators, service layer for business logic and SQL, structured `pino` logging, and automatic hot restart via `tsx watch`.
- **Web (`apps/web`)**: TanStack Start (Vite + Nitro SSR), Better Auth client, SSR session forwarding middleware, TanStack Query custom hooks, Tailwind CSS v4, shadcn/ui primitives, and Motion.
- **Shared Contracts (`packages/shared`)**: Zod input validation schemas, permission definitions, API Data Transfer Object (DTO) types, and site identity.

---

## 2. Request Flow & Cross-Origin Auth Architecture

```text
Browser ──cookies + Origin──▶ Express API :4000 ── routes → services → Drizzle → PostgreSQL
   ▲                              ▲
   └── HTML + data ── Web :3000 ──┘ SSR: forwards the visitor's cookie and X-Request-Id
```

1. **Authentication Boundary**:
   - The browser authenticates with Better Auth on the Express API origin (`http://localhost:4000`) using `credentials: "include"`.
   - CORS and Better Auth's `trustedOrigins` permit the web app origin (`http://localhost:3000`).
   - Every state-mutating cookie-authenticated request (POST, PATCH, DELETE) must pass the `requireTrustedOrigin` middleware.
2. **SSR Session Forwarding**:
   - During server-side rendering, TanStack Start forwards the visitor's request cookie and `X-Request-Id` to `API_INTERNAL_URL` (or `VITE_API_URL`).
   - Route loaders invoke `queryClient.ensureQueryData(...)` so pages hydrate with pre-fetched server data.
3. **Cookie Domain in Production**:
   - Locally, cookies ignore ports and share `localhost`.
   - In production, services must be configured on subdomains (e.g. `app.example.com` and `api.example.com`) sharing `COOKIE_DOMAIN=.example.com`.

---

## 3. Local Development Database (Docker Compose)

- PostgreSQL runs via `compose.dev.yaml` on a random free loopback port determined during setup and recorded in `.env.local`.
- Data is persisted in a Docker named volume (`<COMPOSE_PROJECT_NAME>_postgres-data`).
- **Database Management Commands**:
  - `pnpm db:up` — Start the local PostgreSQL container.
  - `pnpm db:down` — Stop the container while preserving data volume.
  - `pnpm db:status` — Check database container status.
  - `pnpm db:logs` — View live database container logs.
  - `pnpm db:generate` — Generate Drizzle migration SQL files.
  - `pnpm db:migrate` — Apply pending migrations to the database.
  - `pnpm db:studio` — Open Drizzle Studio for visual database inspection.

---

## 4. Security & Permissions (RBAC)

- Roles are defined in `packages/shared/src/permissions.ts`.
- The API uses `requireAuth` for basic authentication and `requirePermission` for operations spanning accounts.
- Roles are granted via CLI:
  ```sh
  pnpm role:set user@example.com admin
  ```
- Presentation checks in the frontend (`roleHasPermission`) hide elements, but authorization is strictly enforced on the Express backend.

---

## 5. Development Diagnostics

- Run `pnpm run doctor` to perform comprehensive checks on Node.js version, pnpm, auth secret length, CORS origins, cookie rules, database connectivity, and required configuration files.
