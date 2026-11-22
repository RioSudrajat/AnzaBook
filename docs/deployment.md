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

## Target Cloud Architecture (Zero-Cost Hackathon & Staging Stack)

To achieve enterprise-grade reliability with 0 monthly infrastructure cost (avoiding Railway's 7-day trial limits), AnzaBook runs on a specialized multi-cloud topology:

| Component                     | Target Provider               | Pricing Tier                                 | Purpose & Configuration                                                                                        |
| :---------------------------- | :---------------------------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Backend API (`apps/api`)**  | **Render.com**                | Free Web Service (512MB RAM)                 | Runs containerized Express 5 + Node.js 22 (`apps/api/Dockerfile`). Health checked via `/api/health`.           |
| **Frontend Web (`apps/web`)** | **Cloudflare Pages**          | Free Tier (Unlimited requests, Edge CDN)     | Builds with `NITRO_PRESET=cloudflare-pages pnpm --filter @starter/web build`. Static output: `.output/public`. |
| **Database (PostgreSQL)**     | **Neon.tech** or **Supabase** | Free Serverless Postgres (0.5 GB, Singapore) | Managed PostgreSQL 16+ with built-in PgBouncer connection pooling (`ap-southeast-1` region).                   |
| **Object Storage**            | **Cloudflare R2**             | Free Tier (10 GB storage, $0 egress fee)     | S3-compatible storage for book covers, manuscript previews, and partner assets. Zero bandwidth fees.           |
| **DNS, SSL & WAF**            | **Cloudflare Free Plan**      | Free SSL & DDoS Mitigation                   | Directs subdomain traffic, enforces HTTPS, and handles proxying for staging and production domains.            |

## Environments and Release Strategy (Trunk-Based)

Deploy AnzaBook across two isolated cloud environments tied to our Trunk-Based workflow:

- **Staging (`main` branch)**: Automatically deployed whenever verified PRs merge into `main`. Uses staging-specific database, Midtrans Sandbox, and test credentials. Staging domain uses `.id` or single-origin proxy.
- **Production (`production` branch)**: Updated exclusively by promoting commits from `main` via Merge Commit (`Protect production (Release)` ruleset). Uses production PostgreSQL with connection pooler, live Midtrans credentials, and `.com` domain.

| Environment      | Web Origin (`WEB_URL`)        | API Origin (`BETTER_AUTH_URL`)    | Shared Cookie Domain (`COOKIE_DOMAIN`) | Host Providers                                |
| :--------------- | :---------------------------- | :-------------------------------- | :------------------------------------- | :-------------------------------------------- |
| **Local Docker** | `http://localhost:3000`       | `http://localhost:4000`           | _(unset / localhost)_                  | Docker Compose (`compose.local.yaml`)         |
| **Staging**      | `https://staging.anzabook.id` | `https://api-staging.anzabook.id` | `.anzabook.id`                         | Cloudflare Pages + Render + Neon/Supabase     |
| **Production**   | `https://app.anzabook.com`    | `https://api.anzabook.com`        | `.anzabook.com`                        | Cloudflare Pages / Node + Render + Managed PG |

> [!IMPORTANT]
> **Domain & Cookie Invariant for Staging:**
> Browsers strictly reject cross-subdomain cookies for domains on the Mozilla Public Suffix List (such as `*.vercel.app` or `*.pages.dev` / `*.onrender.com`).
> For Staging, use a custom domain like `*.anzabook.id` with `COOKIE_DOMAIN=.anzabook.id`. If using temporary free subdomains without a custom domain, configure a reverse proxy rewrite (e.g. rewrite `/api/*` on the Web host to Render API) so both services share the exact same origin.

## GitHub Custodian Protocol: Environments & Secrets Manifest

In accordance with `CONTRIBUTING.md`, `@luminariadev` (DevOps & Security) maintains this manifest of required secret **names**. Actual sensitive values are handed off out-of-band to `@RioSudrajat` (GitHub Custodian) to input into GitHub Repository Settings > Environments (`staging` and `production`):

### Staging Environment (`staging`)

| Secret Variable Name     | Required Service | Purpose / Description                                                |
| :----------------------- | :--------------- | :------------------------------------------------------------------- |
| `NODE_ENV`               | API & Web        | Set to `production` (enables structured JSON logging and HSTS)       |
| `DATABASE_URL`           | API & Migrator   | Staging managed PostgreSQL connection string (Neon/Supabase pooled)  |
| `MIGRATION_DATABASE_URL` | Migrator         | Direct PostgreSQL port connection (if `DATABASE_URL` uses PgBouncer) |
| `BETTER_AUTH_SECRET`     | API              | Minimum 32-character random string for signing auth tokens           |
| `BETTER_AUTH_URL`        | API              | Public API origin: `https://api-staging.anzabook.id`                 |
| `WEB_URL`                | API              | Public Web origin: `https://staging.anzabook.id`                     |
| `COOKIE_DOMAIN`          | API              | `.anzabook.id` (enables cross-subdomain SSR session lookup)          |
| `TRUST_PROXY`            | API              | `1` (resolves real visitor IP behind proxy for rate limiting)        |
| `VITE_API_URL`           | Web Build        | Inlined public API origin: `https://api-staging.anzabook.id`         |
| `MIDTRANS_SERVER_KEY`    | API              | Midtrans Sandbox server key (`SB-Mid-server-...`)                    |
| `MIDTRANS_CLIENT_KEY`    | API              | Midtrans Sandbox client key (`SB-Mid-client-...`)                    |
| `R2_ACCOUNT_ID`          | API (Storage)    | Cloudflare account ID for R2 bucket access                           |
| `R2_ACCESS_KEY_ID`       | API (Storage)    | Cloudflare R2 API token access key ID                                |
| `R2_SECRET_ACCESS_KEY`   | API (Storage)    | Cloudflare R2 API token secret access key                            |
| `R2_BUCKET_NAME`         | API (Storage)    | Staging R2 bucket name (`anzabook-staging`)                          |
| `R2_PUBLIC_DOMAIN`       | API (Storage)    | Public asset CDN origin (e.g. `https://assets-staging.anzabook.id`)  |

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
| `R2_ACCOUNT_ID`          | API (Storage)    | Cloudflare account ID for R2 bucket access                     |
| `R2_ACCESS_KEY_ID`       | API (Storage)    | Cloudflare R2 API token access key ID                          |
| `R2_SECRET_ACCESS_KEY`   | API (Storage)    | Cloudflare R2 API token secret access key                      |
| `R2_BUCKET_NAME`         | API (Storage)    | Production R2 bucket name (`anzabook-prod`)                    |
| `R2_PUBLIC_DOMAIN`       | API (Storage)    | Public asset CDN origin (e.g. `https://assets.anzabook.com`)   |
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

## Local full-stack deployment with Docker Compose

To test the entire containerized production setup locally (PostgreSQL + Migrator + Express API + TanStack Start Web) before shipping to staging:

```sh
# 1. Start all services and run database migrations automatically
docker compose -f compose.local.yaml up --build

# 2. Access the apps locally:
#    - Web Application: http://localhost:3000
#    - API Health Check: http://localhost:4000/api/health/ready
#    - PostgreSQL Server: localhost:5432

# 3. Stop containers and cleanup:
docker compose -f compose.local.yaml down
```

## Cloud Provider Deployment Instructions

### 1. Database: Neon.tech (or Supabase)

1. Create a PostgreSQL project on [Neon.tech](https://neon.tech) in the `ap-southeast-1` (Singapore) region.
2. Obtain the connection string with connection pooling enabled (e.g. `postgresql://user:pass@ep-xyz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`).
3. Set this as `DATABASE_URL` in Render and GitHub Secrets.

### 2. Backend API: Render.com (Free Web Service)

1. In Render Dashboard, click **New + > Web Service** and link the GitHub repository (`RioSudrajat/AnzaBook`).
2. Configure settings:
   - **Name**: `anzabook-api-staging`
   - **Region**: Singapore
   - **Environment**: `Docker`
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Docker Context**: `.` (Repository root)
   - **Health Check Path**: `/api/health`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: _(from Neon/Supabase)_
   - `BETTER_AUTH_SECRET`: _(32+ character random secret)_
   - `BETTER_AUTH_URL`: `https://api-staging.anzabook.id` (or Render default domain)
   - `WEB_URL`: `https://staging.anzabook.id` (or Cloudflare Pages domain)
   - `COOKIE_DOMAIN`: `.anzabook.id`
   - `TRUST_PROXY`: `1`

### 3. Frontend Web: Cloudflare Pages

1. In Cloudflare Dashboard, go to **Compute (Workers) > Workers & Pages > Create application > Pages > Connect to Git**.
2. Select repository `RioSudrajat/AnzaBook` and branch `main`.
3. Configure build settings:
   - **Framework Preset**: `None`
   - **Build Command**: `NITRO_PRESET=cloudflare-pages pnpm --filter @starter/web build`
   - **Build Output Directory**: `apps/web/.output/public`
   - **Root Directory**: _(empty / repository root)_
4. Environment Variables:
   - `NODE_VERSION`: `22`
   - `VITE_API_URL`: `https://api-staging.anzabook.id` (public API origin)
5. Custom Domain:
   - Map `staging.anzabook.id` to the Cloudflare Pages deployment.

### 4. Storage: Cloudflare R2

1. In Cloudflare Dashboard, go to **R2 > Create bucket** named `anzabook-staging`.
2. Enable public read access or connect custom domain `https://assets-staging.anzabook.id`.
3. Create API Token with _Object Read & Write_ permissions.
4. Supply `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` to the Render API environment.

## Map Tile CSP, Geolocation & Location Privacy (Peta Sudut Baca Indonesia)

For the location-aware **Peta Sudut Baca Indonesia** interactive map and home banner:

### 1. Zero New Secret Keys (GitHub Custodian Compliance)

- Uses client-side **MapLibre GL JS** rendering open vector tiles + Google Maps Universal Deep Links (`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`) for navigation.
- **Zero Google Maps API keys or cloud billing cards are required.** Respects the GitHub Custodian Protocol by requiring zero new environment secrets.

### 2. Scoped Geolocation Permissions-Policy

- Web responses send:
  ```http
  Permissions-Policy: display-capture=(), camera=(), microphone=(), geolocation=(self)
  ```
- Browser GPS access is strictly restricted to `(self)`. Third-party iframes cannot access visitor location.
- Sensitive peripherals (`camera`, `microphone`, `display-capture`) remain permanently disabled `()`.

### 3. Edge CSP & Map Tile Allowlist

Reverse proxies, Cloudflare edge rules, and CDN security headers must allow the following directives for MapLibre WebGL tile rendering:

- **Map Tile Origins:**
  - `https://tiles.openfreemap.org`
  - `https://*.basemaps.cartocdn.com`
  - `https://*.tile.openstreetmap.org`
- **Worker Decompression:** `worker-src 'self' blob:` (required by MapLibre web worker vector decoding).
- **Tile Textures:** `img-src 'self' data: blob: https:`.
- **Tile Connect:** `connect-src 'self' https://tiles.openfreemap.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org`.

### 4. Location Privacy Compliance (UU PDP)

- Visitor GPS coordinates are used ephemerally for distance calculation (`GET /api/spots?lat=...&lng=...`).
- Coordinates **must never be persisted** to user records or session cookies.
- Access logs in `apps/api/src/app.ts` (`safeUrl`) and `apps/web/src/start.ts` automatically redact `lat`, `lng`, `minLat`, `maxLat`, `minLng`, and `maxLng` query parameters to prevent tracking in server log streams.
- Community-submitted map links are validated strictly against `googleMapsUrlSchema` (HTTPS Google hosts only) with zero outbound server-side fetching (anti-SSRF).

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
