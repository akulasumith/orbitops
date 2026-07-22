# Orbit Ops - Mini ERP + CRM Portal

Orbit Ops is a role-aware operations portal for a wholesale/distribution team. It focuses on the real business flow: qualify a customer, keep their follow-up context, manage stock, and confirm a sales challan without ever allowing stock to fall below zero.

## Highlights

- JWT sign-in with Admin, Sales, Warehouse, and Accounts roles.
- Searchable customer CRM, customer detail/follow-up endpoints, and lead-state tracking.
- Product catalog, stock thresholds, and an immutable stock-movement audit trail.
- Sales challans with product snapshots and a database transaction for confirmation: rows are locked, stock is checked, inventory is reduced, and movements are recorded atomically.
- Clean responsive React dashboard with role-aware navigation and useful operational cues.
- Docker PostgreSQL setup, environment-based configuration, health endpoint, validation (Zod), consistent API errors, and pagination.

## Architecture

```text
React + Vite UI  -->  Express REST API  --> PostgreSQL
                       | JWT + RBAC
                       | Zod validation
                       | SQL transactions / row locks
```

The API keeps its data model relational. Challan items deliberately save `product_name`, `sku`, and `unit_price`; historic documents remain accurate even when the product record changes later.

## Local setup

Requirements: Node 20+, pnpm 9+, Docker Desktop.

```bash
cp .env.example apps/api/.env
docker compose up -d
pnpm install
pnpm db:seed
pnpm dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

Demo password for every account: `Demo@123`

| Role | Email |
|---|---|
| Admin | admin@orbitops.dev |
| Sales | sales@orbitops.dev |
| Warehouse | warehouse@orbitops.dev |
| Accounts | accounts@orbitops.dev |

## API quick reference

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Get JWT |
| GET/POST | `/customers` | List (supports `page`, `limit`, `q`) / create customers |
| GET/PATCH | `/customers/:id` | Customer profile / update |
| POST | `/customers/:id/followups` | Add a dated note |
| GET/POST | `/products` | Inventory catalog |
| POST | `/products/:id/movements` | Audited stock adjustment |
| GET | `/stock-movements` | Recent inventory audit log |
| GET/POST | `/challans` | List/create sales challans |
| GET | `/dashboard` | Operations metrics and activity |

All endpoints besides login need `Authorization: Bearer <token>`. Sales/Admin manage CRM and challans; Warehouse/Admin manage products and movements. Validation failures return `422`; insufficient stock returns `409`.

### Confirm a challan

```json
POST /challans
{
  "customerId": "uuid",
  "status": "CONFIRMED",
  "items": [{ "productId": "uuid", "quantity": 4 }]
}
```

## Deployment

1. Provision PostgreSQL on Neon, Supabase, Render, or AWS RDS.
2. Run `apps/api/src/schema.sql` once and `pnpm db:seed` only for demo data.
3. Deploy `apps/api` to Render/Railway/Fly with `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, and `PORT` configured as environment variables. Build: `pnpm --dir apps/api build`; start: `pnpm --dir apps/api start`.
4. Deploy `apps/web` to Vercel/Netlify. Set `VITE_API_URL` to the deployed API, build with `pnpm --dir apps/web build`, publish `apps/web/dist`.
5. Set the API CORS origin to the deployed frontend URL.

## Assumptions and next steps

This assignment ships a deliberately focused core. In production I would add database migrations, refresh-token rotation, form modals wired to the existing API endpoints, challan cancellation stock reversal, an invoice PDF worker, S3 image storage, rate limiting, and integration tests against a disposable PostgreSQL instance.
