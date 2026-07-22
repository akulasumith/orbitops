# Full Stack Developer Case Study Submission Report
## Project: Mini ERP + CRM Operations Portal (Orbit Ops)

---

### 📌 1. Project Overview & Deliverables Summary

| Requirement Item | Details / Link |
|---|---|
| **GitHub Repository** | [https://github.com/akulasumith/orbitops](https://github.com/akulasumith/orbitops) |
| **Live Frontend URL** | [https://orbitops-web.vercel.app](https://orbitops-web.vercel.app) |
| **Live Backend API URL** | [https://orbit-ops-api.onrender.com](https://orbit-ops-api.onrender.com) |
| **API Postman Collection** | [`apps/api/postman-collection.json`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/apps/api/postman-collection.json) |
| **Integration Test Suite** | 9/9 Vitest Integration Tests Passed (100% Pass Rate) |

---

### 🔑 2. Role-Based Test Login Credentials

All accounts are pre-configured with the password: **`Demo@123`**

| Role | Email | Password | Permissions & Features Accessible |
|---|---|---|---|
| **Admin** | `admin@orbitops.dev` | `Demo@123` | Full access (CRM, Products, Movements, Challans, Record Deletion) |
| **Sales** | `sales@orbitops.dev` | `Demo@123` | Customer CRM, Follow-ups timeline, Sales Challan Creation & Cancellation |
| **Warehouse** | `warehouse@orbitops.dev` | `Demo@123` | Inventory Catalog management, Audited Stock Movements (IN/OUT) |
| **Accounts** | `accounts@orbitops.dev` | `Demo@123` | Dashboard metrics, Dispatched Challans, Financial & Printable Invoices |

> **Note**: Use the **Demo Role Switcher** buttons in the frontend sidebar to switch between roles instantly during review.

---

### 🏗️ 3. Architecture & Core Engineering Design

```text
React + Vite UI  ──(REST API + JWT)──> Express API Engine ──> PostgreSQL Database
 (apps/web)                              (apps/api)             (Neon / Render / Local)
                                              │
                                              ├── Zod Input Validation
                                              ├── Role-Based Access Control (RBAC)
                                              ├── SQL Row-Locking (`FOR UPDATE`)
                                              └── Dual DB Engine (Postgres + Zero-Config Fallback)
```

#### Key Technical Decisions:
1. **Immutable Historic Invoices (Product Snapshots)**: When a Sales Challan is issued, `challan_items` explicitly saves `product_name`, `sku`, and `unit_price`. Subsequent price adjustments or catalog updates do not mutate historic delivery invoices.
2. **Atomic Transactional Stock Locks (`FOR UPDATE`)**: Challan confirmation executes within a database SQL transaction (`BEGIN ... COMMIT`) with row-level locks to prevent race conditions and guarantee stock levels never drop below zero.
3. **Challan Cancellation & Stock Reversal**: One-click cancellation for draft/confirmed challans automatically restores product stock on hand and logs an audited `IN` movement.
4. **Dual DB Adapter**: The API contains a database adapter that automatically detects PostgreSQL. If PostgreSQL is absent or starting up, it seamlessly operates on an in-memory SQL engine seeded with demo data for zero-config evaluation.

---

### 🛠️ 4. API Endpoints Reference

| Method | Endpoint | Purpose | Validation / Auth |
|---|---|---|---|
| `POST` | `/auth/login` | JWT Token Generation | Email & Password Zod Validation |
| `GET` | `/auth/me` | Fetch User Profile | Bearer JWT Required |
| `GET` | `/customers` | List & Search Customers | Supports `q`, `page`, `limit` |
| `POST` | `/customers` | Add Customer Record | Admin / Sales Only |
| `GET/PATCH` | `/customers/:id` | View / Edit Profile | Admin / Sales Only for PATCH |
| `DELETE` | `/customers/:id` | Delete Customer | Admin Only |
| `POST` | `/customers/:id/followups` | Add Dated CRM Note | Admin / Sales Only |
| `GET` | `/products` | Inventory Catalog List | Supports `page`, `limit` |
| `POST/PATCH` | `/products` | Create / Edit Products | Admin / Warehouse Only |
| `DELETE` | `/products/:id` | Delete Catalog Item | Admin Only |
| `POST` | `/products/:id/movements` | Stock IN/OUT Movement | Audited Stock Adjustment |
| `GET` | `/stock-movements` | Audit Log History | Last 100 Movements |
| `GET/POST` | `/challans` | List / Issue Sales Challan | Product Snapshot & Atomic Stock Deduction |
| `POST` | `/challans/:id/cancel` | Cancel Delivery Challan | Atomic Stock Reversal (`IN` movement logged) |
| `GET` | `/challans/:id/invoice` | Formatted Financial Invoice | 18% GST Tax & Subtotal Calculations |

---

### 🚀 5. Local Setup & Testing Instructions

#### Requirements
- Node.js 20+
- pnpm 9+ (or npm)

#### Commands
```bash
# 1. Clone repo
git clone https://github.com/akulasumith/orbitops.git
cd orbitops

# 2. Install workspace dependencies
npx pnpm install

# 3. Run development servers (Frontend: 5173, API: 4000)
npx pnpm dev

# 4. Run automated Vitest integration suite
npx pnpm --dir apps/api test

# 5. Build production bundle
npx pnpm build
```

---

### 🌟 6. Bonus Features Delivered

- ✅ **Docker Containerization**: Includes multi-stage Dockerfiles ([`apps/api/Dockerfile`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/apps/api/Dockerfile), [`apps/web/Dockerfile`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/apps/web/Dockerfile)) and production compose stack ([`docker-compose.prod.yml`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/docker-compose.prod.yml)).
- ✅ **1-Click Infrastructure Blueprint**: Render blueprint ([`render.yaml`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/render.yaml)) for 1-click cloud stack creation.
- ✅ **Printable Invoices**: Clean invoice modal layout supporting `@media print` with 18% GST calculation and PDF export.
- ✅ **Conventional Folder-Wise Commits**: Git history organized into modular, structured commits.

---

### ⚠️ 7. Known Limitations

1. **Render Free-Tier Sleep**: Render free-tier web services sleep after 15 minutes of inactivity. Initial requests after sleep take 15–30 seconds to spin up.
2. **Future Production Enhancements**: Refresh-token rotation, AWS S3 image storage for product catalog, rate limiting, and invoice PDF email delivery workers.
