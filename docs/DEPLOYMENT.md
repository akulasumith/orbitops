# Orbit Ops — Production Deployment Guide

Orbit Ops is 100% deployment-ready across cloud platforms (Render, Vercel, Railway, Netlify) and Docker VPS environments.

---

## 🛠️ Deployment Options

### Option 1: 1-Click Render Deployment (Recommended Stack)

Render supports Infrastructure-as-Code using the included [`render.yaml`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/render.yaml).

1. Push this repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your repository. Render will automatically create:
   - **PostgreSQL Database** (`orbit-ops-db`)
   - **Node.js Express API** (`orbit-ops-api`)
   - **Static Web Frontend** (`orbit-ops-web`)
5. Click **Apply**. Render will build and deploy the entire platform automatically!

---

### Option 2: Vercel + Managed API (Render/Railway) + Managed Postgres (Neon/Supabase)

#### 1. Database Setup (Neon / Supabase)
1. Create a free PostgreSQL instance on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Copy your connection URI (`postgresql://user:password@host/dbname`).

#### 2. API Backend (Render / Railway / Fly.io)
1. Deploy `apps/api` to Render or Railway.
2. Set Environment Variables:
   - `DATABASE_URL`: Your managed PostgreSQL connection URI.
   - `JWT_SECRET`: A secure random string (e.g. `openssl rand -hex 32`).
   - `CORS_ORIGIN`: Your deployed Vercel frontend URL (or `*`).
   - `PORT`: `4000` (or dynamic host port).
3. Build command: `pnpm --dir apps/api build`
4. Start command: `pnpm --dir apps/api start`

#### 3. Frontend Web App (Vercel)
1. Import repository to [Vercel](https://vercel.com).
2. Set Root Directory to `apps/web`.
3. Set Environment Variable:
   - `VITE_API_URL`: Your deployed API URL (e.g. `https://orbit-ops-api.onrender.com`).
4. Vercel will automatically read [`vercel.json`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/apps/web/vercel.json) for SPA client routing.

---

### Option 3: Full Docker Stack Deployment (Single VPS)

Deploy the entire stack (PostgreSQL + Express API + Nginx Web) on any VPS (DigitalOcean, AWS EC2, Hetzner) using [`docker-compose.prod.yml`](file:///c:/Users/akula/OneDrive/Desktop/FUNDS/docker-compose.prod.yml):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- **Frontend UI**: Runs on port `80`
- **Backend API**: Runs on port `4000`
- **PostgreSQL**: Internal container networking

---

## 🔒 Production Checklist & Security Tips

1. **Change Default Secrets**: Ensure `JWT_SECRET` is set to a secure, random string in production.
2. **CORS Restrictions**: Set `CORS_ORIGIN` on the API backend to your exact frontend domain URL.
3. **Database Backups**: Enable automatic snapshots on Neon, Supabase, or Render PostgreSQL.
4. **Health Check Endpoint**: The API exposes `GET /health` for automated uptime monitors.
