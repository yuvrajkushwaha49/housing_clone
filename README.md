# Workians — Real Estate Platform

Enterprise SaaS for buying, selling, renting, and managing property.

## Foundation batch completed

1. Folder structure  
2. Database schema (auth + RBAC)  
3. Authentication (JWT + refresh + OTP + email verify + password reset)  
4. RBAC (roles, permissions, users list)  
5. Base layout (dark sidebar, topbar, theme toggle)  
6. Dashboard (live KPIs + charts from MySQL)

**Stopped here — confirm before next module (Locations / Amenities / Properties).**

## Stack

React 19 · Redux Toolkit · Bootstrap 5 · Express · MySQL 8 (mysql2 raw SQL) · JWT · Nodemailer · Sharp (wired later for media)

## Local development (Windows / Mac / Linux)

### One command — API + frontend together

From project root:

```powershell
# Windows PowerShell
.\scripts\start-local.ps1
```

Or:

```bash
npm install          # root (concurrently)
npm run install:all  # server + client deps (first time)
npm run dev          # API :5000 + Vite :5173
```

| Service | URL |
|---------|-----|
| Frontend (PC) | http://localhost:5173 |
| Frontend (phone/tablet, same Wi-Fi) | `http://<your-LAN-IP>:5173` (shown when you run `npm run dev`) |
| API health | http://localhost:5173/api/v1/health |

**LAN access:** Vite proxies `/api`, `/socket.io`, and `/uploads` to the API, so other devices on your Wi-Fi only need port **5173**. Allow Node.js through Windows Firewall if needed.

For email verification links on a phone, set in `server/.env`:
`APP_URL=http://<your-LAN-IP>:5173`

Separate terminals (optional):

```powershell
cd server; npm run dev    # nodemon — auto restart
cd client; npm run dev    # Vite
```

### First-time DB setup

```powershell
cd server
npm run migrate
npm run seed
```

Configure `server/.env` (MySQL + Gmail SMTP) and `client/.env` (`VITE_API_URL`).

---

## Production server (VPS / Linux)

Requires **Node 20+**, **PM2**, **Nginx**. MySQL can be remote (e.g. Hostinger).

```bash
# On server after git clone to e.g. /var/www/hous
cp server/.env.example server/.env   # edit production values
cp client/.env.example client/.env   # VITE_API_URL=https://yourdomain.com/api/v1

bash scripts/start-production.sh /var/www/hous
```

Then configure Nginx from `deploy/nginx.conf.example` and SSL (`certbot`).

See `docs/DEPLOYMENT.md` for full checklist.

---

## Setup (legacy step-by-step)

### 1. MySQL

Create credentials matching `server/.env`, then:

```bash
cd server
npm install
npm run migrate
npm run seed
```

Default Super Admin (from seed):

- Email: `superadmin@hous.local`
- Password: `SuperAdmin@12345`

Seed also loads India locations, amenities, categories, and property types.

### 2. API

```bash
cd server
npm run dev    # development (nodemon)
npm start      # production
```

API: `http://localhost:5000/api/v1/health`

### 3. Client

```bash
cd client
npm install
npm run dev
```

App: `http://localhost:5173`

Or from root: `npm run dev` (both together).

## Completed modules

1. Foundation + Auth + RBAC + Layout + Dashboard  
2. Locations · Amenities · Categories · Property core  
3. Leads · Inquiries · Site visits · Admin approval queue  
4. Chat (Socket.io) · Notifications bell · Reviews · Support tickets · FAQ · Complaints  
5. Subscriptions · Advertisements · CMS · Reports · Deploy prep  
6. Builder projects · Towers · Units · Inventory holds · Team · Bookings · Public project page  
7. Role profiles · Verification queue · Property compare  
8. **Account settings · App settings · Demo users · Search Save/Compare + ads sidebar** (this batch)

## Demo accounts (after `npm run seed`)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@hous.local` | `SuperAdmin@12345` |
| Admin | `admin@hous.local` | `Demo@12345` |
| Builder | `builder@hous.local` | `Demo@12345` |
| Agent | `agent@hous.local` | `Demo@12345` |
| Owner | `owner@hous.local` | `Demo@12345` |
| Buyer | `buyer@hous.local` | `Demo@12345` |
| Support | `support@hous.local` | `Demo@12345` |
| CMS | `cms@hous.local` | `Demo@12345` |

## Platform status

Core marketplace MVP is ready for local QA and VPS deploy prep. See `docs/DEPLOYMENT.md`.
