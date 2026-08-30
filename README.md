# Night Arcade

Production-oriented foundation for a play-money Telegram Mini App. The product uses internal
game points only: no deposits, cash-out, crypto transfer, KYC flow, or claims of monetary value.

This iteration intentionally implements only stages 1–3: monorepo/infrastructure, Telegram
authentication, and the User/Wallet/immutable Ledger foundation. Games, missions, PvP, and the
full app shell belong to later stages.

## Architecture

```text
Telegram WebView
  -> React/Vite web app
  -> Authorization: tma <raw initData>
  -> Fastify API (signature + freshness validation)
  -> PostgreSQL (User, Wallet snapshot, append-only LedgerEntry)
  -> Redis (available for the later cache/realtime stages)
```

- `apps/web`: mobile-first React client. The Telegram SDK is initialized before render; theme,
  viewport, stable viewport, safe-area, and content-safe-area values are bridged to CSS.
- `apps/api`: domain-oriented Fastify API. Protected routes never accept a frontend user ID and
  derive identity only from validated Telegram `initData`.
- `packages/shared`: Zod contracts shared by the frontend and backend.
- `Wallet.balance`: transactionally maintained read snapshot. It is not the audit history.
- `LedgerEntry`: append-only audit record. PostgreSQL rejects `UPDATE` and `DELETE` via trigger,
  while unique idempotency keys prevent duplicate credits.
- On first valid authentication, user creation, the STARS wallet, the 500-point demo grant, and
  its ledger entry are committed in one serializable transaction.

## Requirements

- Node.js 22+
- pnpm 11+
- Docker Desktop (recommended for PostgreSQL and Redis)

## Local setup

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

On PowerShell, use `Copy-Item .env.example .env` instead of `cp` if preferred. Web runs at
`http://localhost:5173`; API runs at `http://localhost:3000`; health check is `GET /health`.

Run the complete stack in containers:

```bash
docker compose up --build
```

## Environment variables

Copy `.env.example` and replace placeholders locally. Never commit `.env` or a real Telegram bot
token.

| Variable                        | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string                              |
| `REDIS_URL`                     | Redis connection string                                   |
| `TELEGRAM_BOT_TOKEN`            | BotFather token used only by the API to validate initData |
| `TELEGRAM_AUTH_MAX_AGE_SECONDS` | Maximum accepted initData age                             |
| `WEB_APP_URL`                   | Exact CORS origin for the web app                         |
| `API_URL` / `VITE_API_URL`      | Public API URL for server/web build                       |
| `INITIAL_BALANCE`               | One-time demo grant, default 500 internal stars           |

## Telegram BotFather setup

1. Create a bot with `@BotFather` and keep its token only in the deployment secret store.
2. Deploy the web app on HTTPS; Telegram clients do not load an insecure production Mini App URL.
3. Configure the bot's Mini App/Menu Button URL in BotFather to the deployed web URL.
4. Launch the app from that bot. The frontend reads raw `initData` from the Telegram SDK and sends
   `Authorization: tma <initData>` to the API.
5. Set `WEB_APP_URL` to the exact deployed origin and `VITE_API_URL` to the public HTTPS API.

The API recalculates Telegram's HMAC-SHA256 signature, compares it in constant time, validates
`auth_date`, parses the signed user payload, and only then finds or creates a local user.

## Database

```bash
pnpm db:generate              # generate Prisma Client
pnpm db:migrate               # development migration
pnpm --filter @night-arcade/api exec prisma migrate deploy  # production
pnpm db:seed                  # two future PvP demo users
```

The checked-in initial migration also adds database check constraints for non-negative balances
and the append-only ledger trigger. Prisma schema changes must be delivered as new migrations.

## Implemented API

All application routes require `Authorization: tma <initData>`.

- `GET /api/v1/me`
- `GET /api/v1/wallet`
- `GET /api/v1/ledger?limit=30&cursor=<uuid>`
- `GET /api/v1/games`
- `POST /api/v1/games/coinflip/play`
- `POST /api/v1/games/pool/play`
- `GET /api/v1/daily-reward`
- `POST /api/v1/daily-reward/claim`
- `GET /api/v1/pvp/rooms`
- `POST /api/v1/pvp/match/demo`
- `GET /api/v1/fairness/commitment/:gameType`
- `GET /api/v1/fairness/:roundId`
- `GET /health` (public)

Error responses use `{ code, message, requestId }`. The API includes a CORS allowlist, Helmet,
rate limiting, Zod validation, request IDs, and structured Fastify/Pino logs.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format:check
```

Current tests cover valid/tampered/expired Telegram initData, authorization scheme enforcement,
wallet and ledger consistency, game bets and idempotency, Daily Freebie, and backend/browser
provably-fair verification. The verifier recomputes both the server-seed SHA-256 commitment and
`HMAC_SHA256(serverSeed, clientSeed + ":" + nonce)` locally.

## Production deployment checklist

- Use managed PostgreSQL and Redis with encryption, backups, monitoring, and private networking.
- Store `TELEGRAM_BOT_TOKEN` and database credentials in a secret manager; rotate leaked values.
- Run `prisma migrate deploy` as a release step before serving traffic.
- Use HTTPS for both origins and set the exact `WEB_APP_URL` CORS origin.
- Keep `NODE_ENV=production`, restrict API ingress, and enforce proxy request/body limits.
- Add distributed tracing, log redaction, alerts, database/Redis health probes, and SLOs.
- Run typecheck, lint, tests, build, dependency audit, and container scanning in CI.
- Confirm there are no purchase, deposit, cash-out, crypto, or monetary-value claims in product UI.

## Remaining stages

11. Missions and Reward Center
12. Extended security and concurrency tests
13. Playwright E2E coverage
6. Coin Flip with atomic bets
7. Daily Freebie
8. Pocket Pool
9. PvP and Socket.IO state machine
10. Provably-fair verifier
11. Missions and idempotent claims
12. Security and concurrency test suite
13. Playwright mobile E2E suite
