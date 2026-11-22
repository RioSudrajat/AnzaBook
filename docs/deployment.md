# Hosting the monorepo

Deploy two Node.js services — the API and the web app — connected to a persistent PostgreSQL service. Neither app keeps data on its filesystem.

## Domains and cookies

The browser calls the API directly with cookies, and the web server reads the same cookie during server rendering. Put both apps on subdomains of one site and share the cookie with `COOKIE_DOMAIN`:

| App | Example origin            |
| --- | ------------------------- |
| API | `https://api.example.com` |
| Web | `https://app.example.com` |

Unrelated domains (e.g. `app.example.com` and `example-api.net`) are not supported: the web server would never receive the session cookie. `pnpm run doctor` checks this rule against your settings. Better Auth marks cookies `Secure` automatically when `BETTER_AUTH_URL` is HTTPS.

`COOKIE_DOMAIN` sends the session cookie to **every** host under that domain, not just these two. Anything else served there — a marketing site on a third-party platform, user uploads, preview deployments — receives your users' sessions. Host such content on a different domain, or give the app its own parent (e.g. `api.app.example.com` and `web.app.example.com` with `COOKIE_DOMAIN=.app.example.com`).

## Environments and Release Strategy (Trunk-Based)

Deploy AnzaBook across two isolated cloud environments tied to our Trunk-Based workflow:

- **Staging (`main` branch)**: Automatically deployed whenever verified PRs merge into `main`. Uses staging-specific database, Midtrans Sandbox, and test credentials.
- **Production (`production` branch)**: Updated exclusively by promoting commits from `main` via Merge Commit (`Protect production (Release)` ruleset). Uses production PostgreSQL with connection pooler and live Midtrans credentials.

| Environment    | Web Origin (`WEB_URL`)         | API Origin (`BETTER_AUTH_URL`)     | Shared Cookie Domain (`COOKIE_DOMAIN`) |
| :------------- | :----------------------------- | :--------------------------------- | :------------------------------------- |
| **Staging**    | `https://staging.anzabook.com` | `https://api-staging.anzabook.com` | `.anzabook.com`                        |
| **Production** | `https://app.anzabook.com`     | `https://api.anzabook.com`         | `.anzabook.com`                        |

## GitHub Custodian Protocol: Environments & Secrets Manifest

In accordance with `CONTRIBUTING.md`, `@luminariadev` (DevOps & Security) maintains this manifest of required secret **names**. Actual sensitive values are handed off out-of-band to `@RioSudrajat` (GitHub Custodian) to input into GitHub Repository Settings > Environments (`staging` and `production`):

### Staging Environment (`staging`)

| Secret Variable Name     | Required Service | Purpose / Description                                                |
| :----------------------- | :--------------- | :------------------------------------------------------------------- |
| `NODE_ENV`               | API & Web        | Set to `production` (enables structured JSON logging and HSTS)       |
| `DATABASE_URL`           | API & Migrator   | Staging managed PostgreSQL connection string                         |
| `MIGRATION_DATABASE_URL` | Migrator         | Direct PostgreSQL port connection (if `DATABASE_URL` uses PgBouncer) |
| `BETTER_AUTH_SECRET`     | API              | Minimum 32-character random string for signing auth tokens           |
| `BETTER_AUTH_URL`        | API              | Public API origin: `https://api-staging.anzabook.com`                |
| `WEB_URL`                | API              | Public Web origin: `https://staging.anzabook.com`                    |
| `COOKIE_DOMAIN`          | API              | `.anzabook.com` (enables cross-subdomain SSR session lookup)         |
| `TRUST_PROXY`            | API              | `1` (resolves real visitor IP behind proxy for rate limiting)        |
| `VITE_API_URL`           | Web Build        | Inlined public API origin: `https://api-staging.anzabook.com`        |
| `MIDTRANS_SERVER_KEY`    | API              | Midtrans Sandbox server key (`SB-Mid-server-...`)                    |
| `MIDTRANS_CLIENT_KEY`    | API              | Midtrans Sandbox client key (`SB-Mid-client-...`)                    |

### Production Environment (`production`)

| Secret Variable Name     | Required Service | Purpose / Description                                          |
| :----------------------- | :--------------- | :------------------------------------------------------------- |
| `NODE_ENV`               | API & Web        | Set to `production`                                            |
| `DATABASE_URL`           | API & Migrator   | Production managed PostgreSQL connection string                |
| `MIGRATION_DATABASE_URL` | Migrator         | Direct PostgreSQL port connection for Drizzle migrator         |
| `BETTER_AUTH_SECRET`     | API              | Cryptographically secure random secret (isolated from staging) |
| `BETTER_AUTH_URL`        | API              | Production API origin: `https://api.anzabook.com`              |
| `WEB_URL`                | API              | Production Web origin: `https://app.anzabook.com`              |
| `COOKIE_DOMAIN`          | API              | `.anzabook.com`                                                |
| `TRUST_PROXY`            | API              | `1`                                                            |
| `VITE_API_URL`           | Web Build        | Inlined public API origin: `https://api.anzabook.com`          |
| `MIDTRANS_SERVER_KEY`    | API              | Midtrans Live production server key                            |
| `MIDTRANS_CLIENT_KEY`    | API              | Midtrans Live production client key                            |

## Production environment

**API** (private values through your host):

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://user:password@database-host:5432/app
BETTER_AUTH_SECRET=your-random-secret-at-least-32-characters
BETTER_AUTH_URL=https://api.example.com
WEB_URL=https://app.example.com
COOKIE_DOMAIN=.example.com
# Behind a load balancer or reverse proxy (hop count, or a subnet list; never true):
TRUST_PROXY=1
# Optional: extra browser origins allowed to call the API with cookies.
# TRUSTED_ORIGINS=https://admin.example.com
# Optional direct connection when DATABASE_URL uses a pooler:
# MIGRATION_DATABASE_URL=postgresql://user:password@direct-host:5432/app
```

**Web**:

```dotenv
NODE_ENV=production
# Build time — inlined into the browser bundle:
VITE_API_URL=https://api.example.com
# Runtime, optional — the address the web server uses to reach the API privately:
API_INTERNAL_URL=http://api:4000
```

`NODE_ENV=production` switches both servers to JSON logs and the web app to sending HSTS. The Docker images set it; set it yourself everywhere else.

`TRUST_PROXY` matters: the API resolves the client IP from it and hands that IP to Better Auth for per-IP rate limits on sign-in/sign-up. Set the number of proxies in front of the API (usually `1`) or their subnets. The API refuses `true`, which would trust any `X-Forwarded-For` a client sends and let it choose the IP its attempts are counted under. Without a proxy, leave it unset (the socket address is used and client-supplied `X-Forwarded-For` is ignored).

Keep provider-required TLS settings. Do not disable certificate verification. The example credentials are placeholders, not defaults.

## Release steps without Docker

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
VITE_API_URL=https://api.example.com pnpm build
NODE_ENV=production node apps/api/dist/server.js           # API
NODE_ENV=production node apps/web/.output/server/index.mjs # Web
```

Apply migrations once per release. Both servers honor `PORT` and `HOST`. The API bundle (`apps/api/dist`) includes its dependencies; it needs only `dist/` (and `drizzle/` for migrations).

## Docker images

Build from the repository root. Each Dockerfile prunes the workspace with `turbo prune`, installs from the pruned lockfile, builds, and ships only the output:

```sh
docker build -f apps/api/Dockerfile -t my-api .
docker build -f apps/api/Dockerfile --target migrator -t my-api-migrate .
docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.example.com -t my-web .
```

```sh
docker run --rm -e DATABASE_URL="$DATABASE_URL" my-api-migrate

docker run -d -p 4000:4000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  -e BETTER_AUTH_URL=https://api.example.com \
  -e WEB_URL=https://app.example.com \
  -e COOKIE_DOMAIN=.example.com \
  -e TRUST_PROXY=1 \
  my-api

docker run -d -p 3000:3000 -e API_INTERNAL_URL=http://api:4000 my-web
```

The builds need no secrets. Pass real values to running containers; never put secrets in `--build-arg`, `ENV`, or the image. `VITE_API_URL` is public by design. Rebuild the web image when the API's public origin changes.

Both images run as the unprivileged `node` user. Their `HEALTHCHECK`s report liveness only (`/api/health`, `/icon.svg`), so a database outage does not restart healthy processes. `GET /api/health/ready` additionally checks PostgreSQL for platforms that want a readiness probe. Both servers shut down gracefully on SIGTERM.

## Logs in production

Both servers write one JSON object per line to stdout with `level`, `time`, `service` (`api`/`web`), `env`, `msg`, and `reqId` (plus `userId` on authenticated API requests). Ship stdout to your log platform; correlate a page render across services by `reqId`. Forward an `X-Request-Id` from your load balancer and both servers reuse it. `LOG_LEVEL` adjusts verbosity; `LOG_SQL=true` is for debugging only.

## Connection pooling and scaling

The API uses one node-postgres pool with at most ten connections per process. Multiple instances multiply the connection count: use your provider's pooler and tune limits. Better Auth's rate-limit storage is in memory per instance; for several API instances configure shared rate-limit storage (see Better Auth's rate-limit docs). The web server keeps no state.

## Security checklist

Built in: authenticated and origin-checked API routes, ownership filtered in SQL, sign-in/sign-up rate limits, 100 kB request bodies (including Better Auth's), `httpOnly` `SameSite=Lax` session cookies, helmet on the API, and frame/nosniff/referrer headers (plus HSTS in production) on the web app. Before launch, confirm:

- [ ] Both origins are HTTPS and `NODE_ENV=production` is set on both services.
- [ ] `TRUST_PROXY` matches your proxy hops, so rate limits see real client IPs.
- [ ] Nothing untrusted is served under `COOKIE_DOMAIN` (see [Domains and cookies](#domains-and-cookies)).
- [ ] Several API instances share rate-limit storage (see [scaling](#connection-pooling-and-scaling)).
- [ ] Your proxy or load balancer also caps request bodies and slow uploads.
- [ ] `admin` is granted only to people trusted with every account: it can impersonate users, set their passwords and emails, delete them, and grant roles. Give moderators a narrower role ([roles](backend.md#role-based-access)).
- [ ] Features that create many rows or call paid services have per-user limits.
- [ ] You decided on email verification and password recovery; neither is configured.
- [ ] If you want a script-blocking Content Security Policy, add one with per-request nonces; the base only restricts framing, `<base>`, and plugins.

## Local Docker versus hosted data

`compose.dev.yaml` is a local convenience. It publishes PostgreSQL on loopback only and stores data in a named volume. Use PostgreSQL backups or your provider's backup service and test restoration; Docker volumes are persistence, not backups.

Account emails are not verified by the base. Add an email provider for verification and password recovery when needed.

References: [Better Auth Express integration](https://better-auth.com/docs/integrations/express), [Better Auth cookies](https://better-auth.com/docs/concepts/cookies), [TanStack Start hosting](https://tanstack.com/start/latest/docs/framework/react/hosting), [Turborepo Docker guide](https://turborepo.com/docs/guides/tools/docker), [node-postgres pooling](https://node-postgres.com/features/pooling).
