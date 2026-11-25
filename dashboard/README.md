# Payment Gateway Merchant Dashboard

Frontend merchant dashboard for the **Scalable Payment Gateway** Express/PostgreSQL backend. It focuses on real API integration, clear empty/error states, and a restrained fintech SaaS UI suitable for interview demos.

## Screens

| Route | Purpose |
| --- | --- |
| `/` | Overview metrics, charts, recent activity |
| `/orders` | List/search/filter/create orders |
| `/orders/[id]` | Order detail + create payment intent |
| `/payments` | List/search/filter payment intents |
| `/payments/[id]` | Payment intent detail + attempts |
| `/ledger` | Ledger transactions with debit/credit totals |
| `/ledger/[id]` | Ledger detail, entries, reversal action |
| `/api-docs` | Documented live backend endpoints |
| `/settings` | Merchant profile + integration notes |

## Technology Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query
- React Hook Form + Zod
- Recharts
- Sonner
- Vitest + Testing Library

## Architecture

```
Browser UI
   │  /api/bff/*
   ▼
Next.js BFF (server-only MERCHANT_API_KEY)
   │  x-api-key
   ▼
Express Payment Gateway API
   ▼
PostgreSQL
```

Important security choices:

- Merchant API key stays in server env vars only
- No API keys in `NEXT_PUBLIC_*`, source code, or localStorage
- No invented email/password login flow
- Dashboard is a **single-merchant local demo** BFF, not multi-tenant auth

## Backend Endpoints Integrated

- `GET /health`
- `GET /api/merchant/profile`
- `GET /api/merchant/overview`
- `GET/POST /api/orders`
- `GET /api/orders/:id`
- `GET/POST /api/payment-intents`
- `GET /api/payment-intents/:id`
- `GET /api/ledger/transactions`
- `GET /api/ledger/transactions/:id`
- `POST /api/ledger/transactions/:id/reverse`

## Known Backend Limitations

1. Authentication is API-key only. There is no merchant session/login API.
2. No dedicated analytics time-range filters beyond the overview endpoint’s last-30-days volume query.
3. Payment capture/refund merchant actions are not exposed as separate dashboard endpoints unless already present in the backend.
4. Dashboard operates as one configured merchant via `MERCHANT_API_KEY`.

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Public | Non-secret base URL for docs examples |
| `GATEWAY_API_BASE_URL` | Server | Backend origin used by BFF proxy |
| `MERCHANT_API_KEY` | Server | Demo merchant key injected as `x-api-key` |

Generate a merchant key from the backend repo:

```bash
# from repo root
node scripts/create-merchant.js "Demo Store" demo@example.com
```

## Local Setup

1. Start PostgreSQL and the backend (`npm start` in repo root) on port `5000`.
2. Configure `dashboard/.env.local` with gateway URL + merchant API key.
3. Install and run the dashboard:

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest
```

## Project Structure

```
dashboard/
  src/
    app/                 # App Router pages + BFF route handlers
    components/
      layout/            # Sidebar, header, shell
      dashboard/         # Shared UI building blocks
      orders/
      payments/
      ledger/
      api-docs/
      settings/
      ui/                # shadcn/ui primitives
    lib/                 # API client, types, schemas, formatters
```

## Suggested Git Commit Message

```
Add merchant dashboard with BFF-backed orders, payments, and ledger UI
```
