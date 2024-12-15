# EARTHLYN Production Operations

## Current Deployment Targets

| Component | Provider | Notes |
| --- | --- | --- |
| Frontend | Vercel | Public app: `https://earthlyn.vercel.app` |
| Primary API | Railway | Public API: `https://api-production-cbc6.up.railway.app` |
| Optional API target | Render | `render.yaml` is maintained as a deployable blueprint |
| Database | PostgreSQL | Neon, Railway Postgres, Render Postgres, or any managed PostgreSQL-compatible service |
| Upload storage | Local volume or S3/R2 | S3/R2-compatible storage is recommended for multi-node production |

## Release Gates

- Run `npm run verify:ci`.
- Run `npm run audit:prod`.
- Run `docker compose -f docker-compose.prod.yml config` with production environment variables loaded.
- Confirm `NODE_ENV=production`, `ENABLE_SWAGGER=false`, and `ALLOW_ADMIN_REGISTRATION=false`.
- Confirm `CORS_ORIGIN` exactly matches the deployed frontend origin.
- Confirm `NEXT_PUBLIC_BACKEND_URL` points to the live API origin.
- Confirm Stripe keys match the intended mode. Use live keys before real customer payments.

## Secrets

- Store secrets in the deployment platform secret manager, not in Compose files.
- Rotate `JWT_SECRET`, `MESSAGE_ENCRYPTION_KEY`, Stripe keys, SendGrid keys, database password, and Redis password after staff changes or suspected exposure.
- Use at least 32 random characters for `JWT_SECRET` and `MESSAGE_ENCRYPTION_KEY`.
- Never deploy known placeholder values; backend startup rejects them in production.

## Data Persistence

- PostgreSQL uses the `postgres_data` Docker volume.
- Redis uses the `redis_data` Docker volume.
- Local backend uploads use the `uploads_data` Docker volume at `/app/public/uploads`.
- Multi-node production should use S3/R2-compatible object storage:
  - Set `UPLOAD_STORAGE_DRIVER=s3`.
  - Set `UPLOAD_S3_BUCKET`, `UPLOAD_S3_ACCESS_KEY_ID`, `UPLOAD_S3_SECRET_ACCESS_KEY`, and `UPLOAD_S3_PUBLIC_BASE_URL`.
  - Set `UPLOAD_S3_ENDPOINT` for Cloudflare R2, MinIO, or another S3-compatible provider.
  - Keep KYC document buckets private unless a signed download flow is added for reviewers.

## Queues

- Local development uses `QUEUE_DRIVER=inline`.
- Production can use Redis-backed BullMQ with `QUEUE_DRIVER=bullmq`.
- Configure `REDIS_URL` for Render Key Value, Upstash, Railway Redis, or another Redis-compatible provider. `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` remain available for local Docker-style deployments.
- Configure `QUEUE_JOB_ATTEMPTS`, `QUEUE_JOB_BACKOFF_MS`, and `QUEUE_WORKER_CONCURRENCY`.
- Email jobs are processed by the backend worker process and retried with exponential backoff.

## Backups

- Schedule PostgreSQL backups at least daily.
- Test restores on a separate database before relying on the backup policy.
- Keep encrypted backup copies in a different infrastructure account or region.
- Upload volume backups are required until object storage is adopted.

## Deployment

### Vercel Frontend

- Build command: `npm run vercel-build`
- Production URL: `https://earthlyn.vercel.app`
- Required public variables:
  - `NEXT_PUBLIC_BACKEND_URL`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_PROCESSING_FEE_RATE`

### Railway API

- Root directory: `apps/backend`
- Config file: `apps/backend/railway.json`
- Dockerfile: `apps/backend/Dockerfile`
- Start command: `node scripts/start-production.mjs`
- Health check: `/health`

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRATION`
- `MESSAGE_ENCRYPTION_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `REQUIRE_EMAIL_VERIFICATION`
- `QUEUE_DRIVER`

### Docker Compose

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

## Health Checks

- Frontend: `GET /`
- Backend liveness: `GET /health/live`
- Backend readiness: `GET /health/ready`
- PostgreSQL and Redis health checks are defined in Compose.

## Monitoring

- Collect container logs centrally.
- Alert on API restarts, failed health checks, database storage growth, and payment webhook failures.
- Add Sentry or OpenTelemetry-based application error monitoring before broad public launch.
- Alert on BullMQ failed-job growth when `QUEUE_DRIVER=bullmq` is enabled.

## Rollback

- Keep the previous image tag available.
- Roll back frontend and backend images together if an API contract changes.
- Do not roll back database migrations without a tested reverse migration or restore plan.
