# Scalable Payment Gateway Backend

Fintech-style backend that **simulates** payment processing with merchant-facing REST APIs, idempotent payment-intent creation, and a double-entry ledger.

This project does **not** process real payments, connect to card networks, or store real card details. All provider behavior is simulated for engineering practice and interview demonstration.

## Architecture

```
Client (merchant)
    │  x-api-key + JSON
    ▼
Express 5 API  ── Helmet / CORS / Zod validation
    │
    ├─ Auth middleware (SHA-256 API key hash lookup)
    ├─ Orders module
    ├─ Payment intents module (idempotency)
    └─ Ledger module (capture posting + reversals)
            │
            ▼
       PostgreSQL
       (constraints, deferred balance triggers, immutability)
```

Key design choices:

- **CommonJS** Node.js services with thin Express routers
- **Parameterized SQL** via `pg` (no ORM)
- **Database-enforced integrity** for ledger balance, currency match, and immutability
- **Merchant-scoped idempotency** for safe retries

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| HTTP | Express 5 |
| Database | PostgreSQL |
| Validation | Zod |
| Security | Helmet, CORS, SHA-256 hashed API keys |
| Tests | Vitest, Supertest |

## Features

1. Merchant REST APIs for orders and payment intents
2. SHA-256 hashed API-key authentication with active merchant/key checks and key-usage tracking
3. Idempotent payment-intent creation (`Idempotency-Key` header)
4. Double-entry ledger with deferred balance triggers
5. Immutable ledger entries/transactions and first-class reversals
6. Simulated payment provider + payment state machine
7. Integration and unit tests covering auth, idempotency, and ledger integrity

## Database Design

Primary tables:

- `merchants` / `merchant_api_keys`
- `payment_orders` / `payment_intents` / `payment_attempts`
- `idempotency_keys` (unique on `merchant_id + idempotency_key`)
- `ledger_accounts` / `ledger_transactions` / `ledger_entries`

Ledger integrity (DB-enforced):

- Deferred constraint triggers require ≥2 entries and debit == credit
- Entry account currency must match transaction currency
- Ledger entries and transactions are immutable (no UPDATE/DELETE)
- Account currency cannot change after creation
- Reversals use `original_transaction_id` with a uniqueness constraint (one reversal per original)
- Trigger + CHECK constraints prevent reversing a reversal and keep reversal metadata consistent

Migrations live in `src/database/migrations/` and are tracked in `schema_migrations`.

## API Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Liveness check |
| `GET` | `/api/merchant/profile` | Yes | Authenticated merchant profile |
| `POST` | `/api/orders` | Yes | Create a payment order |
| `POST` | `/api/payment-intents` | Yes | Create a payment intent (idempotent) |
| `POST` | `/api/ledger/transactions/:id/reverse` | Yes | Reverse a ledger transaction |

## Authentication Flow

1. Merchant is provisioned with `scripts/create-merchant.js`
2. Raw key format: `pg_live_` + 64 hex chars
3. Only the **SHA-256 hash** is stored (`merchant_api_keys.key_hash`)
4. Requests send `x-api-key: <raw key>`
5. Middleware rejects missing/malformed keys, inactive keys, and non-active merchants
6. Successful auth updates `last_used_at`
7. Raw keys are never returned from API responses

## Idempotency Design

Payment-intent creation requires `Idempotency-Key` (8–255 chars).

For each request the API stores:

- `merchant_id` (scope)
- `idempotency_key`
- SHA-256 `request_hash` of method + endpoint + validated body
- Completed `response_status` / `response_body`

Behavior:

- Same merchant + key + payload → original stored response
- Same key + different payload → `409`
- Concurrent duplicates → unique constraint + row locking; only one intent is created
- Insert + work + response persistence run in one PostgreSQL transaction so failures roll back cleanly

## Ledger Design

On payment capture the service posts a balanced double-entry transaction, for example:

- Debit `GATEWAY_CLEARING` (platform asset)
- Credit `MERCHANT_PAYABLE` (merchant liability)

Balance and currency rules are enforced by deferred PostgreSQL triggers so invalid transactions cannot commit.

## Reversal Design

Reversals never edit history:

1. Lock the original ledger transaction (`FOR UPDATE`)
2. Reject missing originals, already-reversed originals, and reversals-of-reversals
3. Insert a new `transaction_type = 'reversal'` row referencing `original_transaction_id`
4. Copy currency / payment intent linkage; flip every debit↔credit with the same amounts and accounts
5. Rely on unique constraint + deferred balance triggers for concurrency and integrity

## Environment Variables

Copy `.env.example` to `.env` and set values for your local PostgreSQL instance:

```bash
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=payment_user
DB_PASSWORD=change_me
DB_NAME=payment_gateway
```

Do not commit real credentials. `.env` is gitignored.

## Setup

```bash
npm install
cp .env.example .env   # then edit credentials
npm run migrate
node scripts/create-merchant.js "Demo Store" demo@example.com
npm start
```

Development reload:

```bash
npm run dev
```

## Running Migrations

```bash
npm run migrate
```

The runner applies pending `*.sql` files in sorted order under advisory lock and records them in `schema_migrations`. Already-applied migrations are never modified; schema changes always get a new sequential file.

## Running Tests

```bash
npm test
```

Tests use Vitest + Supertest against the configured PostgreSQL database. Prefer isolated fixtures and transaction rollback where practical.

## Example Requests

### Health

```bash
curl -s http://localhost:5000/health
```

```json
{
  "status": "OK",
  "message": "Payment Gateway API is running"
}
```

### Create order

```bash
curl -s -X POST http://localhost:5000/api/orders \
  -H "content-type: application/json" \
  -H "x-api-key: pg_live_..." \
  -d '{
    "merchant_order_reference": "ORD-1001",
    "amount": 50000,
    "currency": "INR",
    "description": "Demo order"
  }'
```

### Create payment intent (idempotent)

```bash
curl -s -X POST http://localhost:5000/api/payment-intents \
  -H "content-type: application/json" \
  -H "x-api-key: pg_live_..." \
  -H "Idempotency-Key: intent-ord-1001" \
  -d '{"order_id":"<order-uuid>"}'
```

### Reverse a ledger transaction

```bash
curl -s -X POST http://localhost:5000/api/ledger/transactions/<ledger-tx-uuid>/reverse \
  -H "x-api-key: pg_live_..."
```

## Project Layout

```
src/
  app.js
  server.js
  middleware/auth.js
  config/
  database/migrations/
  modules/
    orders/
    payments/
    ledger/
    providers/
scripts/
  migrate.js
  create-merchant.js
tests/
dashboard/          # Next.js merchant dashboard (BFF + UI)
```

## Merchant Dashboard

A Next.js merchant dashboard lives in `dashboard/`. It proxies authenticated API calls through a server-side BFF so the merchant API key never reaches the browser.

```bash
cd dashboard
cp .env.example .env.local   # set GATEWAY_API_BASE_URL + MERCHANT_API_KEY
npm install
npm run dev
```

See `dashboard/README.md` for pages, architecture, and known limitations.

## License

ISC
# PayCore
