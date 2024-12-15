# EARTHLYN Backend

NestJS API for the EARTHLYN marketplace. The service owns authentication, marketplace data, payments, messaging, fulfillment, support, analytics, privacy, and admin operations.

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Registration, login, logout, JWT validation, email verification, password reset |
| `buyer`, `seller`, `admin` | Role-specific account and dashboard APIs |
| `product`, `product-approval` | Catalog, seller listings, product reviews, admin approval |
| `order`, `payment`, `delivery-management`, `fulfillment` | Checkout, Stripe payment state, cancellation, tracking, fulfillment events |
| `messaging`, `websocket`, `message-moderation` | Buyer/seller messaging, unread state, moderation, realtime notifications |
| `seller-kyc`, `privacy`, `customer-service`, `disputes` | Compliance, support, data exports, dispute workflows |
| `analytics`, `growth`, `referrals`, `subscriptions` | Admin reporting, campaigns, referrals, subscription plans |
| `notifications`, `common` | Shared notifications, email, upload, queue, and utility services |

## Commands

```bash
npm ci --include=dev
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run lint
npm run test
npm run start:prod
```

## Required Production Environment

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | At least 32 random characters |
| `JWT_EXPIRATION` | Defaults to `7d` |
| `MESSAGE_ENCRYPTION_KEY` | At least 32 random characters |
| `STRIPE_SECRET_KEY` | Use `sk_live_...` for real payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Verified sender address |
| `CORS_ORIGIN` | Exact frontend origin; never `*` in production |
| `FRONTEND_URL` | Used for email links and redirects |
| `REQUIRE_EMAIL_VERIFICATION` | Recommended `true` in production |
| `QUEUE_DRIVER` | `inline` or `bullmq` |
| `REDIS_URL` | Required when `QUEUE_DRIVER=bullmq` |

Optional S3/R2-compatible upload variables are documented in `../../docs/PRODUCTION_OPERATIONS.md`.

## Startup

Production startup uses `scripts/start-production.mjs`.

1. Run Prisma migrations with `prisma migrate deploy`.
2. Start `dist/main.js`.
3. Write fatal bootstrap errors directly to stderr so provider logs show startup failures.

## Health Checks

- `GET /health/live` - process liveness
- `GET /health/ready` - application readiness and database check
- `GET /health` - summary health endpoint

Swagger remains disabled unless `ENABLE_SWAGGER=true`.

