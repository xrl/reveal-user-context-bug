# Reveal SDK UserContextProvider Bug Reproduction

## Bug

`System.IndexOutOfRangeException` in `RevealEnginePrg.UserContextProvider.GetUserContext`
on **linux-x64**. The exact same code works correctly on **osx-arm64**.

```
System.IndexOutOfRangeException: Index was outside the bounds of the array.
   at RevealEnginePrg.UserContextProvider.GetUserContext(HttpContext aspnetContext)
   at Reveal.Sdk.DefaultUserContextResolver.get_UserId()
   at Infragistics.Reveal.Engine.Controllers.RevealController.ResolveUserId()
   at Infragistics.Reveal.Engine.Controllers.RevealController.VerifyConnectionByDataSource(...)
```

The crash happens regardless of:
- What the `userContextProvider` returns (valid context, null, or no provider configured)
- What HTTP headers are forwarded to the .NET engine
- Whether the request comes from a browser or curl

## Quick Start

```bash
# Set your Reveal SDK license key
export REVEAL_LICENSE="your-license-key-here"

docker compose up --build
```

Wait for all services to start (the reveal-server takes ~10-15 seconds for the .NET engine to initialize).

## Reproduce

1. Open http://localhost:3000
2. Click the **"+"** button in the dashboard editor to add a visualization
3. Select **"Transactions Database"** from the data source list
4. Click to verify the connection
5. Observe HTTP 500 with "Something went wrong. Correlation Id: ..."

## View Engine Logs

```bash
docker exec reveal-user-context-provider-bug-reveal-server-1 \
  cat /tmp/reveal-logs/RevealLog.txt | grep -A5 Exception
```

## Expected vs Actual

- **Expected**: Connection verified, `transactions` table listed, data available for dashboard
- **Actual**: 500 error from the .NET engine with `IndexOutOfRangeException` in `GetUserContext`

## Architecture

```
frontend (nginx, port 3000)
  └─ Loads Reveal JS SDK from CDN
  └─ Signs JWT with hard-coded RSA private key
  └─ Connects to reveal-server

reveal-server (Node.js + Express, port 5111)
  └─ Verifies JWT with matching RSA public key
  └─ Mounts reveal-sdk-node middleware
  └─ userContextProvider returns RVUserContext with userId and organizationId
  └─ linux-x64 RevealEnginePrg binary crashes in GetUserContext

postgres (PostgreSQL 17, port 5432)
  └─ public.transactions table with 100 rows of sample e-commerce data
  └─ reveal.dashboards table for dashboard storage
```

## Versions Tested

| Package | Version | Result |
|---------|---------|--------|
| reveal-sdk-node | 1.8.2 | Crashes on linux-x64 |
| reveal-sdk-node | 1.8.3 | Crashes on linux-x64 |
| reveal-sdk-node | 1.8.4-rc.1 | Crashes on linux-x64 |

All versions work correctly on osx-arm64.

- Node.js: 22
- Platform: linux/amd64 (Docker)
