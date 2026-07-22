# Orbit Ops — Mini ERP + CRM Operations Portal

Orbit Ops is a role-aware operations portal designed for wholesale/distribution businesses. It focuses on end-to-end real business workflows: qualifying leads, managing customer follow-ups, cataloging inventory, recording audited stock movements, and confirming sales delivery challans with atomic stock validation to ensure stock never drops below zero.

---

## 📋 Official Case Study Submission Details

| Requirement | Details / Link |
|---|---|
| **1. GitHub Repository** | [https://github.com/akulasumith/orbitops](https://github.com/akulasumith/orbitops) |
| **2. Live Frontend URL** | [https://orbitops-web.vercel.app](https://orbitops-web.vercel.app) |
| **3. Live Backend API URL** | [https://orbit-ops-api.onrender.com](https://orbit-ops-api.onrender.com) |
| **4. Postman Collection** | Included in repo at `apps/api/postman-collection.json` |

---

## 🔐 4. Test Login Credentials for All Roles

All accounts use the demo password: **`Demo@123`**

| Role | Email | Permissions & Core Responsibilities |
|---|---|---|
| **Admin** | `admin@orbitops.dev` | Full system access (CRM, Catalog, Challans, Delete operations, System Settings) |
| **Sales** | `sales@orbitops.dev` | Customer CRM management, follow-up timeline entry, Sales Challan creation & cancellation |
| **Warehouse** | `warehouse@orbitops.dev` | Inventory catalog management, Audited Stock Movements (IN/OUT adjustments) |
| **Accounts** | `accounts@orbitops.dev` | View-only operational metrics, dispatched challans, printable invoices & financial totals |

*Note: Use the **Demo Role Switcher** buttons in the frontend sidebar to switch between roles instantly during review.*

---

## 🏗️ 7. Architecture Explanation

```text
React + Vite UI  ──(REST API + JWT)──> Express API Engine ──> PostgreSQL Database
 (apps/web)                              (apps/api)             (Neon / Render / Local)
                                              │
                                              ├── Zod Input Validation
                                              ├── Role-Based Access Control (RBAC)
                                              ├── SQL Row-Locking (`FOR UPDATE`)
                                              └── Dual DB Engine (Postgres + Zero-Config Fallback)
```

### Key Architectural Decisions:
1. **Product Snapshot in Challan Items**: When a Sales Challan is issued, `challan_items` stores historical snapshots of `product_name`, `sku`, and `unit_price`. Future price edits or product updates will never alter historical financial invoices.
2. **Atomic Stock Locking (`FOR UPDATE`)**: Challan confirmation executes within a database SQL transaction (`BEGIN ... COMMIT`). Row-level locks prevent race conditions and guarantee stock levels never fall below zero.
3. **Zero-Config Dual DB Engine**: The backend API contains a database adapter that automatically detects PostgreSQL availability. If PostgreSQL is absent or starting up, it seamlessly operates on an in-memory SQL store seeded with demo data so tests and reviewers can evaluate instantly without setup friction.

---

## 🚀 6. Setup & Deployment Instructions

### Local Setup (Development)

**Requirements**: Node.js 20+, pnpm (or npm).

```bash
# 1. Clone repository
git clone https://github.com/akulasumith/orbitops.git
cd orbitops

# 2. Install workspace dependencies
npx pnpm install

# 3. Start development server (API: port 4000, Web: port 5173)
npx pnpm dev
```
Open `http://localhost:5173` in your browser.

---

### Running Automated Integration Tests

To run the Vitest test suite testing authentication, RBAC, customer management, stock movements, and challan reversals:

```bash
npx pnpm --dir apps/api test
```

---

### Environment Variables & Production Setup

#### Backend (`apps/api/.env`):
```env
PORT=4000
JWT_SECRET=your-secure-production-jwt-secret
CORS_ORIGIN=*
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orbit_ops
```

#### Frontend (`apps/web/.env`):
```env
VITE_API_URL=https://orbit-ops-api.onrender.com
```

---

## 🎁 Bonus Points Implemented

- ✅ **Docker Setup**: Includes multi-stage Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) and single-command production stack [`docker-compose.prod.yml`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/docker-compose.prod.yml).
- ✅ **1-Click Infrastructure Blueprint**: Render blueprint [`render.yaml`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/render.yaml) for 1-click cloud deployments.
- ✅ **Printable Invoices**: Native printable invoice document layout with 18% GST tax calculation and browser PDF export support.
- ✅ **Folder-Wise Conventional Commits**: Repository features structured commits adhering to Conventional Commits standards.

---

## ⚠️ 8. Known Limitations & Future Enhancements

1. **Cold Starts on Render Free Tier**: Render's free tier puts inactive backend web services to sleep after 15 minutes of inactivity. Initial requests may take 15–30 seconds to wake the service.
2. **Future Enhancements**: Refresh-token rotation, AWS S3 image uploads for product catalog, rate limiting, and invoice email delivery workers.
