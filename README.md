<div align="center">

<img src="https://img.shields.io/badge/EARTHLYN-Sustainable%20Commerce-2d6a4f?style=for-the-badge&labelColor=1b4332" alt="Earthlyn" />

<br /><br />

**A full-stack, production-grade eco-commerce marketplace.**  
Buyers · Sellers · Admins · Customer Service — one cohesive platform, live in production.

<br />

[![Live Demo](https://img.shields.io/badge/Frontend-Live%20on%20Vercel-black?style=flat-square&logo=vercel)](https://earthlyn-biratkdks-projects.vercel.app)
[![API](https://img.shields.io/badge/Backend-Live%20on%20Render-46e3b7?style=flat-square&logo=render&logoColor=black)](https://earthlyn-backend.onrender.com/health)

<br />

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/NestJS-e0234e?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-2d3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Stripe](https://img.shields.io/badge/Stripe-635bff?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io)](https://socket.io)

</div>

---

## Overview

Earthlyn is a sustainability-first marketplace where eco-conscious buyers discover verified products, sellers build and grow their storefronts, and admins run operations — all through a single, unified platform.

Built as a **production monorepo** with strict separation between the Next.js frontend and NestJS backend. Covers the complete commerce lifecycle end-to-end: discovery → checkout → fulfillment → payouts → analytics → support.

---

## Live

| Service | URL |
| --- | --- |
| Frontend | <https://earthlyn-biratkdks-projects.vercel.app> |
| API health | <https://earthlyn-backend.onrender.com/health> |

> The backend runs on Render's free tier — first request after idle may take ~30s to wake.

---

## Features

### Buyer
- Product discovery with category, eco score, price, and sort filters
- Cart, Stripe-powered checkout, and order tracking with real-time WebSocket updates
- Eco points earned on delivery, rewards dashboard, and referral program
- Monthly eco subscription boxes (Seed, Bloom, Evergreen tiers)
- AI-driven product recommendations, seller messaging, and review system
- Dispute filing, customer service tickets, and notification centre
- Privacy centre: consent management, GDPR data export, and account deletion

### Seller
- Product listings with image upload, inline editing, and admin approval workflow
- Processing fee preview on creation, live delivery management dashboard
- Earnings tracker with date-range filtering and profit summary
- Tiered profit system: **Seed → Sprout → Growth → Bloom → Evergreen → Earth Guardian**
- Auto tier upgrade based on cumulative sales milestones
- KYC document upload with admin review workflow
- Seller onboarding checklist and buyer messaging

### Admin
- Dashboard with revenue, orders, users, and eco-impact KPIs
- Product approval/rejection queue and moderation tooling
- Seller KYC review (approve / reject with reason)
- Tier management with manual override capability
- Dispute management with status tracking and resolution notes
- Refund operations against Stripe payment intents with full audit trail
- Analytics: revenue, eco impact, retention, referrals, subscriptions, top sellers, categories
- Balance management, user lookup, and immutable admin audit log
- Growth tools: marketing campaigns, subscription plan management, referral oversight

### Platform
- Cookie-based session auth with HTTP-only JWT, CSRF double-submit protection, and RBAC
- AES-256 encrypted real-time messaging via Socket.IO
- Email verification, password reset, and SendGrid integration
- BullMQ background job queue (Upstash Redis in production, inline fallback for local dev)
- S3/R2-compatible file storage with local filesystem fallback
- Production-hardened env validation — rejects weak secrets, wildcard CORS, placeholder values at startup

---

## Architecture

```
earthlyn/
├── apps/
│   ├── frontend/          # Next.js 16, React 19, Tailwind 4, Zustand 5
│   └── backend/           # NestJS, Prisma ORM, PostgreSQL, Socket.IO
├── render.yaml            # Render deploy blueprint (backend)
├── railway.json           # Railway deploy config (backend, alt)
├── docker-compose.yml     # Local full-stack (Postgres + Redis + API + Web)
└── docker-compose.prod.yml
```

### Request flow

```
Browser → Next.js (App Router) → proxy.ts middleware (cookie auth)
                                        ↓
                              NestJS REST API (port 3001)
                                        ↓
                         Prisma ORM → PostgreSQL (Neon)
                                        ↓
                   Stripe · SendGrid · Socket.IO · BullMQ (Upstash)
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand 5 with persistence |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 (Neon serverless) |
| Auth | JWT in HTTP-only cookies, CSRF double-submit tokens |
| Payments | Stripe (PaymentIntents, webhooks, refunds) |
| Realtime | Socket.IO (orders, delivery updates, messaging) |
| Email | SendGrid |
| Queue | BullMQ + Upstash Redis (inline fallback for local dev) |
| Storage | Local filesystem / S3-compatible (R2, AWS S3) |
| Deployment | Vercel (frontend) · Render (backend) · Neon (database) |

---

## Getting Started

### Prerequisites

- Node.js 20 LTS
- PostgreSQL 16+
- Redis 7+ *(only required when `QUEUE_DRIVER=bullmq`)*

### 1 — Clone and install

```bash
git clone https://github.com/biratkdk/Earthlyn-Frontend.git
cd earthyln-frontend

npm ci --prefix apps/frontend
npm ci --prefix apps/backend
```

### 2 — Configure environment

```bash
cp apps/frontend/.env.local.example apps/frontend/.env.local
cp apps/backend/.env.example        apps/backend/.env
```

Edit both files. At minimum set `DATABASE_URL`, `JWT_SECRET` (32+ chars), and `MESSAGE_ENCRYPTION_KEY` (32 chars).

### 3 — Run database migrations

```bash
cd apps/backend
npx prisma migrate dev
```

### 4 — Start dev servers

```bash
# Two separate terminals from the repo root:
npm run dev:backend    # → http://localhost:3001
npm run dev:frontend   # → http://localhost:3000
```

---

## Docker (recommended for local parity)

```bash
docker compose up --build
```

Starts PostgreSQL, Redis, Prisma migrations, the NestJS API, and Next.js in one command.

---

## Environment Variables

### Frontend — `apps/frontend/.env.local`

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `NEXT_PUBLIC_PROCESSING_FEE_RATE` | No | Default `0.05` (5%) |

### Backend — `apps/backend/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 chars |
| `MESSAGE_ENCRYPTION_KEY` | Yes | Exactly 32 chars, AES messaging |
| `CORS_ORIGIN` | Yes | Frontend origin (e.g. `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `SENDGRID_API_KEY` | Yes | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Yes | Verified sender address |
| `REDIS_URL` | BullMQ only | Required when `QUEUE_DRIVER=bullmq` |

See [`apps/backend/.env.example`](apps/backend/.env.example) for the full reference.

---

## Scripts

```bash
npm run dev:frontend       # Start Next.js dev server
npm run dev:backend        # Start NestJS dev server

npm run build:frontend     # Production build
npm run build:backend      # Production build

npm run lint:frontend      # ESLint — frontend
npm run lint:backend       # ESLint — backend

npm run test:backend       # Jest unit tests

npm run verify:ci          # Full CI gate: lint + test + build + audit
```

---

## Deployment

| Target | Provider | Config file |
| --- | --- | --- |
| Frontend | [Vercel](<https://vercel.com)> | Auto-detected (Next.js, root `apps/frontend`) |
| Backend | [Render](<https://render.com)> | [`render.yaml`](render.yaml) |
| Database | [Neon](<https://neon.tech)> | `DATABASE_URL` env var |
| Redis | [Upstash](<https://upstash.com)> | `REDIS_URL` env var |

**Required env vars for production backend:**

```
NODE_ENV=production
DATABASE_URL=           # Neon connection string
JWT_SECRET=             # 40+ random hex chars
MESSAGE_ENCRYPTION_KEY= # 32 random hex chars
CORS_ORIGIN=            # Vercel frontend URL
STRIPE_SECRET_KEY=      # sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=  # whsec_... (from Stripe webhook endpoint)
SENDGRID_API_KEY=       # SG....
SENDGRID_FROM_EMAIL=    # Verified sender
REDIS_URL=              # rediss://... (Upstash TLS URL)
QUEUE_DRIVER=bullmq
```

---

## Security

- HTTP-only cookie sessions — no JWTs exposed to JavaScript
- CSRF double-submit tokens on all state-changing requests
- RBAC across four roles: `BUYER`, `SELLER`, `ADMIN`, `CUSTOMER_SERVICE`
- AES-256 encrypted message content at rest
- Password reset tokens are single-use and hash-rotated on change
- Email verification with 24h expiry tokens
- Admin actions (KYC, refunds, balance, tier) write immutable audit records
- Startup validation rejects missing, weak, or placeholder secrets

To report a vulnerability, see [SECURITY.md](SECURITY.md).

---

## Project Structure

```
apps/frontend/src/
├── app/                   # Next.js App Router pages
│   ├── dashboard/         # Role dashboards (buyer · seller · admin · cs)
│   ├── products/          # Storefront and product detail
│   ├── orders/            # Order list and live order tracking
│   ├── messages/          # Real-time encrypted messaging
│   └── ...
├── components/
│   ├── auth/              # AuthBootstrap (session hydration)
│   ├── layout/            # Navbar
│   ├── privacy/           # CookieConsent
│   └── ui/                # ConfirmDialog, ErrorState, Skeleton, Toast, Pagination
├── lib/
│   ├── api/               # Axios client, CSRF, growth API, pagination helpers
│   ├── store/             # Zustand auth + cart stores
│   ├── types/             # Shared API types
│   └── utils/             # Route helpers, error normalisation, asset URLs
└── proxy.ts               # Edge middleware — cookie-based route protection

apps/backend/src/
├── auth/                  # Login, register, JWT, CSRF, cookie management
├── product/               # Listings, reviews, approval, recommendations
├── order/                 # Order lifecycle, cancellation
├── payment/               # Stripe PaymentIntents, webhooks, refunds
├── delivery-management/   # Fulfillment steps, eco points, tier upgrades
├── seller/                # Seller profile, earnings, profit summary
├── seller-kyc/            # Document upload and admin KYC review
├── messaging/             # AES-encrypted conversations
├── disputes/              # Buyer/seller dispute workflow
├── analytics/             # Admin analytics endpoints
├── growth/                # Campaigns, referrals, subscription plans
├── privacy/               # GDPR consent, data export, account deletion
├── websocket/             # Socket.IO gateway (orders, delivery, messages)
└── common/                # Guards, decorators, filters, pagination, CSRF middleware
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, code standards, commit style, and the PR process.

---

<div align="center">

Built with purpose. Designed to scale. Shipped with care.

</div>
