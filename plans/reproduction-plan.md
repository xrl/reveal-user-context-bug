# Reveal SDK UserContextProvider IndexOutOfRangeException - Reproduction Plan

## Bug Summary

`RevealEnginePrg.UserContextProvider.GetUserContext(HttpContext aspnetContext)` throws
`System.IndexOutOfRangeException` on the **linux-x64** native binary. The exact same
code works on **osx-arm64**. Tested on reveal-sdk-node versions 1.8.2, 1.8.3, and
1.8.4-rc.1 -- all crash identically.

The crash is **not** caused by:
- The userContextProvider return value (crashes even with `null` or no provider configured)
- Request headers (crashes with only content-type/content-length/host forwarded)
- Browser-specific behavior (crashes with minimal `curl` requests)

Stack trace:
```
System.IndexOutOfRangeException: Index was outside the bounds of the array.
   at RevealEnginePrg.UserContextProvider.GetUserContext(HttpContext aspnetContext)
   at Reveal.Sdk.DefaultUserContextResolver.get_UserId()
   at Infragistics.Reveal.Engine.Controllers.RevealController.ResolveUserId()
   at Infragistics.Reveal.Engine.Controllers.RevealController.VerifyConnectionByDataSource(...)
```

---

## Reproduction Architecture

```
docker-compose.yml
  ├── postgres (port 5432)
  │     └── init.sql  (creates app user, reveal schema, transactions table with seed data)
  ├── reveal-server (port 5111)
  │     └── Node.js + Express + reveal-sdk-node (linux-x64 binary)
  └── frontend (port 3000)
        └── Static HTML/JS app with Reveal JS client SDK
```

All three services boot with `docker compose up`. The frontend opens a dashboard editor
that connects to the reveal-server, which connects to postgres. Clicking "Add Data Source"
and verifying the connection triggers the crash.

---

## File Structure

```
reveal-user-context-provider-bug/
├── plans/
│   └── reproduction-plan.md          # This file
├── docker-compose.yml
├── README.md                         # Quick-start instructions for Infragistics
├── postgres/
│   └── init.sql                      # Schema + seed data
├── reveal-server/
│   ├── Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                  # Server entry point
│       ├── app.ts                    # Express app setup
│       ├── config/
│       │   ├── jwt.ts                # JWT key loader
│       │   ├── reveal.ts             # Reveal SDK middleware config
│       │   └── database.ts           # PG pool
│       ├── middleware/
│       │   └── authMiddleware.ts     # JWT verification
│       └── providers/
│           ├── userContextProvider.ts
│           ├── dataSourceProvider.ts
│           ├── authProvider.ts
│           └── dashboardProvider.ts
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── public/
        └── index.html                # Single-page app with Reveal JS client
```

---

## Step-by-Step Implementation

### 1. PostgreSQL Init Script (`postgres/init.sql`)

Creates:
- Role `app_user` with password `app_password`
- Database `repro_db` owned by `app_user`
- Schema `reveal` (for Reveal dashboard storage)
- Table `public.transactions` with columns:
  - `id` serial PRIMARY KEY
  - `item_description` varchar(100)
  - `quantity` integer
  - `unit_price` numeric(10,2)
  - `total` numeric(10,2)
  - `date` date
  - `category` varchar(50)
  - `organization_id` integer
- Table `reveal.dashboards`:
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` varchar(255)
  - `content` jsonb
  - `organization_id` integer
  - `created_at` timestamptz DEFAULT now()
  - `updated_at` timestamptz DEFAULT now()

Seed `public.transactions` with ~100 rows of realistic e-commerce data across
multiple categories and dates (Jan-Feb 2026). Example categories: Clothing,
Electronics, Office Supplies, Food & Beverage. Vary quantities (1-20) and prices
($5-$500) for interesting dashboard visualizations.

Grant `app_user` full access to both schemas.

### 2. JWT Authentication (Hard-coded Keys)

Generate a single RSA key pair. Hard-code:
- **Private key** in the frontend (signs the JWT)
- **Public key** in the reveal-server (verifies the JWT)

The frontend generates a JWT on page load with a fixed payload:
```json
{
  "sub": "user-1",
  "org_id": 1,
  "iss": "repro-app",
  "exp": <1 hour from now>
}
```

This keeps authentication simple while still exercising the `userContextProvider`
code path that triggers the bug.

### 3. Reveal Server (`reveal-server/`)

**package.json**: Dependencies:
- `express` ^5.2.1
- `cors` ^2.8.5
- `jsonwebtoken` ^9.0.2
- `pg` ^8.13.0
- `reveal-sdk-node` ^1.8.3
- `pino` ^10.3.0
- Dev: `typescript`, `tsx`, `@types/*`

**src/index.ts**: Starts Express on PORT (default 5111).

**src/app.ts**: Express app with:
1. CORS (allow frontend origin)
2. Health check at GET /health (checks DB connectivity)
3. JWT auth middleware (all routes except /health)
4. GET /dashboards -- list dashboards for the user's org
5. Header bridge middleware (copies `req.userContext` to `x-reveal-*` headers)
6. Reveal SDK middleware mounted at `/`

**src/providers/userContextProvider.ts**:
- Reads `x-reveal-userid` and `x-reveal-organizationid` headers
- Falls back to parsing JWT from Authorization header
- Returns `new RVUserContext(userId, properties)` with organizationId in properties map

**src/providers/dataSourceProvider.ts**:
- Configures a single PostgreSQL data source `repro-transactions`
- Points to PG_HOST:PG_PORT/PG_DATABASE, schema `public`
- Enables server-side aggregation

**src/providers/authProvider.ts**:
- Returns `RVUsernamePasswordDataSourceCredential` with PG_USER/PG_PASSWORD

**src/providers/dashboardProvider.ts**:
- Reads/writes dashboards from `reveal.dashboards` table as JSONB
- Wraps dashboard JSON in a ZIP file (.rdash format) with `Dashboard.json` entry
- Filters by organization_id from userContext

**src/middleware/authMiddleware.ts**:
- Verifies JWT with RS256 algorithm, issuer "repro-app"
- Attaches `userContext` to Express Request with userId, organizationId

**src/config/jwt.ts**:
- Loads public key from `REVEAL_BI_JWT_PUBLIC_KEY` env var or `--jwt-public-key` file

**src/config/reveal.ts**:
- Creates Reveal SDK middleware with all providers
- Sets `engineLogLevel: "Trace"` and `engineLogDir: "/tmp/reveal-logs"`

**src/config/database.ts**:
- pg.Pool connected to PG_HOST/PG_PORT/PG_DATABASE with REVEAL_DB_USER/REVEAL_DB_PASSWORD

**Dockerfile** (same pattern as rx-reveal):
```dockerfile
# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

# Production stage - must use glibc-based image (not alpine)
FROM node:22-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libicu72 libssl3 wget postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
RUN cd node_modules/reveal-sdk-node && node install.js
RUN chmod +x node_modules/.pnpm/reveal-sdk-node*/node_modules/reveal-sdk-node/native/*/RevealEnginePrg || true
COPY --from=builder /app/dist ./dist
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nodejs && chown -R nodejs:nodejs /app
USER nodejs
ENV DOTNET_BUNDLE_EXTRACT_BASE_DIR=/tmp/.net
EXPOSE 5111
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5111/health || exit 1
CMD ["node", "dist/index.js"]
```

### 4. Frontend (`frontend/`)

**public/index.html**: Single HTML page that:
1. Loads Reveal JS client SDK from CDN (`https://cdn.revealbi.io/reveal/libs/[version]`)
2. Generates a JWT using the hard-coded private key (via jsrsasign library from CDN)
3. Configures `$.ig.RevealSdkSettings`:
   - `setBaseUrl("http://localhost:5111")`
   - Sets authorization header provider to return the JWT
4. Creates a `RevealView` component that opens a new dashboard in edit mode
5. Provides a "Verify Connection" button flow:
   - Click "+" to add a data source
   - Select the PostgreSQL data source
   - Click to verify connection -> triggers the crash on linux-x64

**Dockerfile** (simple nginx):
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
EXPOSE 3000
```

**nginx.conf**:
```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 5. Docker Compose (`docker-compose.yml`)

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin_password
      POSTGRES_DB: repro_db
    volumes:
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d repro_db"]
      interval: 5s
      timeout: 3s
      retries: 5

  reveal-server:
    build:
      context: ./reveal-server
      dockerfile: Dockerfile
    platform: linux/amd64
    ports:
      - "5111:5111"
    environment:
      PORT: "5111"
      NODE_ENV: development
      PG_HOST: postgres
      PG_PORT: "5432"
      PG_DATABASE: repro_db
      REVEAL_DB_USER: app_user
      REVEAL_DB_PASSWORD: app_password
    env_file:
      - ./reveal-server/.env
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5111/health"]
      interval: 10s
      timeout: 3s
      start_period: 15s
      retries: 5

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      reveal-server:
        condition: service_healthy
```

Key detail: `platform: linux/amd64` on reveal-server forces the linux-x64 native
binary even on Apple Silicon, which is essential for reproducing the bug.

### 6. reveal-server/.env

Contains the RSA public key (multiline PEM) for JWT verification. This file is
referenced via `env_file` in docker-compose.yml to handle multiline env vars
properly.

```
REVEAL_BI_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
<public key content>
-----END PUBLIC KEY-----"
```

### 7. README.md

Short, focused instructions:

```markdown
# Reveal SDK UserContextProvider Bug Reproduction

## Bug
`System.IndexOutOfRangeException` in `RevealEnginePrg.UserContextProvider.GetUserContext`
on linux-x64. Works correctly on osx-arm64.

## Quick Start
docker compose up --build

## Reproduce
1. Open http://localhost:3000
2. Click "+" to add a data source
3. Select "Transactions Database" (PostgreSQL)
4. Click "Set Up" / verify connection
5. Observe HTTP 500 response with "Something went wrong. Correlation Id: ..."

## Expected vs Actual
- **Expected**: Connection verified, tables listed
- **Actual**: 500 error. Engine log at `/tmp/reveal-logs/RevealLog.txt` inside the
  reveal-server container shows:
  ```
  System.IndexOutOfRangeException: Index was outside the bounds of the array.
     at RevealEnginePrg.UserContextProvider.GetUserContext(HttpContext aspnetContext)
     at Reveal.Sdk.DefaultUserContextResolver.get_UserId()
  ```

## Versions Tested
- reveal-sdk-node: 1.8.2, 1.8.3, 1.8.4-rc.1 (all crash)
- Node.js: 22
- Platform: linux/amd64 (crashes), darwin/arm64 (works)

## View Engine Logs
docker exec reveal-user-context-provider-bug-reveal-server-1 \
  cat /tmp/reveal-logs/RevealLog.txt
```

---

## Implementation Notes

- Keep everything minimal -- this is a bug report, not a production app.
- No migrations or knex -- the init.sql handles all schema setup.
- The dashboard provider stores dashboards as JSONB directly (no ZIP needed for
  initial setup, only when the Reveal client saves a dashboard).
- The frontend uses CDN-hosted Reveal JS SDK and jsrsasign -- no build step needed.
- Hard-coded JWT keys mean zero setup for the Infragistics team: just `docker compose up`.

---

## Debugging Notes (Native macOS Dev Server)

### Problem: Native server also shows "Verification failed"

When running the reveal-server natively on macOS (osx-arm64) via `pnpm dev`, the
"Verify Connection" step also fails with "Something went wrong." This is a
**different issue** from the linux-x64 `IndexOutOfRangeException`.

### Root causes found

1. **`--env-file` flag doesn't work with `tsx`**: The dev script
   `tsx watch --env-file=.env src/index.ts` passes `--env-file` to tsx, not to
   node. tsx silently ignores it, so **no env vars from `.env` are loaded**. This
   means `REVEAL_LICENSE` is empty, causing the .NET engine to exit immediately
   with "The license key is missing or has expired." The Node.js process stays
   alive (Express still serves `/health`) but all reveal-api requests fail because
   the engine is dead.

   **Fix**: Either:
   - Use `node --env-file=.env --import=tsx src/index.ts` (passes flag to node)
   - Or `set -a; source .env; set +a` before running `pnpm dev`

2. **`.env` had wrong database credentials**: The `.env` originally had
   `PG_PORT=32780` and `REVEAL_DB_USER=xlange` (personal local postgres settings).
   The docker compose postgres runs on port **5432** with user **app_user** /
   password **app_password**. Updated `.env` to match docker compose postgres.

3. **Engine log file truncation breaks logging**: The .NET engine opens
   `/tmp/reveal-logs/reveal-engine.log` once at startup. If you truncate the file
   (e.g. `> reveal-engine.log`), the engine's file handle becomes invalid and no
   further logs are written. Must restart the server to get logging back.

### Native dev workflow (correct)

```bash
# Terminal 1: Start postgres + frontend via docker compose
docker compose up postgres frontend

# Terminal 2: Start reveal-server natively
cd reveal-server
source .env  # or: set -a; source .env; set +a
npx tsx src/index.ts

# Open http://localhost:3000
```

### Confirmed: osx-arm64 works, linux-x64 crashes

When the native server is running correctly (license loaded, database connected),
the osx-arm64 engine handles verify-connection without errors. The
`IndexOutOfRangeException` is linux-x64 only.
