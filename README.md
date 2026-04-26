# 🚀 DevPilot — The One Dev Pilot

**Deploy full-stack apps from your phone. No laptop needed.**

Built by FanzoftheOne · Powered by Anthropic Claude · GitHub · Railway · Vercel

---

## Deploy in 3 steps

### 1. Backend → Railway

- New project → deploy from GitHub repo
- Root Directory: `backend`
- Build: `npm install`
- Start: `node server.js`
- Add PostgreSQL plugin
- Set env vars (see below)
- Run in Railway shell: `node db/migrate.js`

### 2. Frontend → Vercel

- Import repo → Root Directory: `frontend`
- Set `NEXT_PUBLIC_API_URL` = your Railway backend URL
- Deploy

### 3. Wire

After both are live, set in Railway:
```
ALLOWED_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

---

## Railway Environment Variables

```
NODE_ENV=production
PORT=3001
DATABASE_URL=           ← auto-injected by Railway Postgres plugin
SESSION_SECRET=         ← long random string (32+ chars)
ALLOWED_ORIGINS=        ← your Vercel URL
FRONTEND_URL=           ← your Vercel URL
ENCRYPTION_KEY=         ← 32 char random string (for API key encryption)
LICENSE_API_URL=        ← optional: https://devpilot.app/api/license

# Optional — Cloudflare R2 for BrainVault cloud sync
STORAGE_ENDPOINT=       ← https://ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET=devpilot-vault
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_PUBLIC_URL=     ← https://pub-xxx.r2.dev
```

## Vercel Environment Variables

```
NEXT_PUBLIC_API_URL=    ← your Railway backend URL (no trailing slash)
NEXT_PUBLIC_APP_NAME=DevPilot
```

---

## Local Development

```bash
# Spin up everything with Docker
docker-compose up --build

# Or run separately:
cd backend && npm install && node db/migrate.js && node server.js
cd frontend && npm install && npm run dev
```

---

## Tiers

| Feature | Free | Pro ($9/mo) | Team ($29/mo) |
|---|---|---|---|
| Projects | 3 | Unlimited | Unlimited |
| Deploy pipeline | ✓ | ✓ | ✓ |
| Live terminal | ✓ | ✓ | ✓ |
| BrainVault | ✓ | ✓ | ✓ |
| AI Audit | — | ✓ | ✓ |
| AI Fix | — | ✓ | ✓ |
| AI Chat | — | ✓ | ✓ |
| Cloud Vault (R2) | — | ✓ | ✓ |
| Multi-user | — | — | ✓ |

---

## Stack

- **Frontend**: Next.js 15 + Tailwind CSS → Vercel
- **Backend**: Node.js + Express + Socket.IO → Railway
- **Database**: PostgreSQL → Railway
- **Real-time**: Socket.IO (live deploy logs)
- **AI**: Anthropic Claude (Haiku routing, Sonnet quality)
- **Storage**: Cloudflare R2 (BrainVault cloud sync)
- **Auth**: License-key sessions

---

## The Vision

DevPilot is part of **The ONE Platform** by FanzoftheOne — a self-sustaining AI ecosystem where agents autonomously build, deploy, and improve full-stack applications entirely from Android using Termux.

Every build teaches the BrainVault. Every pattern is reused. Every project ships faster than the last.

**devpilot.app** · support@devpilot.app
