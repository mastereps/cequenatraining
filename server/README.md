# Webinar API Server

Node.js and Express backend for the Cequena Training and Consultancy website. The server provides authentication, webinar registration and manual payment review, email delivery, book catalog routes, contact email delivery, legacy cart endpoints, and optional PayMongo checkout support.

## Tech Stack

- Node.js with ECMAScript modules
- Express 4
- PostgreSQL through `pg`
- Nodemailer for SMTP delivery
- Built-in `node:test` runner for backend tests

## Setup

Install backend dependencies:

```bash
npm install
```

Create the local runtime configuration:

```bash
cp .env.example .env
```

Set the PostgreSQL credentials and secrets in `.env`, then start the API:

```bash
npm run dev
```

The API listens on `http://localhost:5001` by default. The frontend Vite server proxies `/api` requests to that port.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with `node server.js`. |
| `npm start` | Start the API with `node server.js`. |
| `npm test` | Run the backend test suite once with Node's built-in runner. |
| `npm run test:watch` | Run backend tests in watch mode. |

## Architecture

`server.js` builds and exports the Express `app`. Running `node server.js` also calls `startServer()`, which opens the HTTP port, starts the email outbox worker, and registers graceful shutdown handlers. Tests import `app` without opening the production port or starting the worker.

The backend contains two styles of endpoint implementation:

- Modular auth and webinar code uses `routes/`, `controllers/`, and `services/`.
- Older contact, catalog, and legacy cart handlers remain inline in `server.js`.

```text
server/
  controllers/           HTTP response translation for auth and webinars
  middleware/            Cookie auth attachment and role checks
  migrations/            PostgreSQL schema changes applied after the base dump
  routes/                Auth, webinar, payment, and webhook routers
  services/              Business rules, persistence, email queue, and PayMongo client
  test/                  Dependency-free node:test coverage
  utils/                 Validation, crypto, cart, logging, and error helpers
  workers/               Email outbox polling worker
  db.js                  PostgreSQL pool
  loadEnv.js             Loads server/.env
  server.js              Express app and runtime startup
  index.js               Backward-compatible startup entry point
```

## Main API Areas

| Area | Main implementation |
| --- | --- |
| Health, contact, books, legacy events, legacy carts | `server.js` |
| Authentication | `routes/auth.js`, `controllers/authController.js`, `services/authService.js` |
| Webinars and manual payment review | `routes/webinars.js`, `controllers/webinarController.js`, `services/webinarService.js` |
| Book checkout through PayMongo | `routes/payments.js`, `services/paymongo.js` |
| PayMongo webhook handling | `routes/webhooks.js` |
| Queued webinar emails | `services/emailOutboxService.js`, `workers/emailOutboxWorker.js` |

See `docs/API.md` for endpoint details and `docs/DATABASE.md` for database bootstrap notes.

## Environment Variables

Copy `.env.example` to `.env` and replace placeholder values. The main groups are:

| Group | Variables |
| --- | --- |
| Runtime | `NODE_ENV`, `PORT`, `PUBLIC_BASE_URL`, `CORS_ORIGINS` |
| PostgreSQL | `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, pool tuning variables |
| Auth | `AUTH_COOKIE_NAME`, `AUTH_SESSION_SECRET`, `AUTH_SESSION_TTL_SECONDS` |
| Verification | `VERIFY_TOKEN_SECRET`, `VERIFY_TOKEN_TTL_MINUTES` |
| Webinar behavior | `WEBINAR_DEFAULT_PRICE_CENTS`, `WEBINAR_CURRENCY`, `WEBINAR_RESEND_COOLDOWN_SECONDS` |
| SMTP and contact | `SMTP_*`, `MAIL_FROM`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` |
| Email worker | `EMAIL_WORKER_ENABLED`, `EMAIL_WORKER_INTERVAL_MS`, `EMAIL_WORKER_BATCH_SIZE`, `EMAIL_OUTBOX_DRY_RUN` |
| PayMongo | `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` |

Production requires strong values for `AUTH_SESSION_SECRET` and `VERIFY_TOKEN_SECRET`. Keep `.env` local and never commit real credentials.

## Database Setup

The current schema is not represented by one SQL file. Bootstrap a local database using:

1. The root `fullstack_testv10.sql` snapshot.
2. The SQL migrations in `migrations/`, in filename order.

See `docs/DATABASE.md` for details.

## Email Delivery

Webinar emails are queued into the `email_outbox` table inside the same transaction as the associated business change. `workers/emailOutboxWorker.js` polls pending messages and sends them through SMTP.

For local development without outbound SMTP, use:

```dotenv
EMAIL_OUTBOX_DRY_RUN=true
```

The direct `/api/contact` endpoint sends immediately and still requires SMTP configuration.

## Testing

The initial suite is intentionally dependency-free and does not connect to PostgreSQL. It covers:

- validation, crypto, auth sessions, and cart helpers
- auth middleware and role guards
- PayMongo request and signature boundaries
- rate limit, idempotency, and email outbox service SQL calls with stub clients
- HTTP smoke checks that do not require database access

Run:

```bash
npm test
```

Database-backed tests for webinar transactions and webhook state transitions remain a follow-up. They should use a dedicated PostgreSQL test database with migration bootstrap and cleanup, never a developer or production database.

## Common Development Workflow

1. Install dependencies with `npm install`.
2. Create `server/.env` from `.env.example`.
3. Bootstrap PostgreSQL from the base dump plus ordered migrations.
4. Start the API with `npm run dev`.
5. Start the frontend separately from `../webinar`.
6. Run `npm test` after backend changes.
7. Run syntax checks for edited JavaScript files before deployment.

## Deployment Note

`deploy.sh` expects backend runtime configuration at `server/.env`, matching `loadEnv.js`. Create that file from `.env.example` before deploying.
