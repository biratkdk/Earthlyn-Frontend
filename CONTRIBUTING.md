# Contributing to Earthlyn

Thanks for taking the time to contribute. This document covers everything you need to go from zero to an open pull request.

---

## Table of contents

- [Setup](#setup)
- [Development workflow](#development-workflow)
- [Code standards](#code-standards)
- [Commit style](#commit-style)
- [Pull request process](#pull-request-process)
- [Quality gates](#quality-gates)

---

## Setup

```bash
git clone https://github.com/biratkdk/Earthlyn-Frontend.git
cd earthyln-frontend

npm ci --prefix apps/frontend
npm ci --prefix apps/backend

cp apps/frontend/.env.local.example apps/frontend/.env.local
cp apps/backend/.env.example        apps/backend/.env
```

Edit both env files with local credentials, then run migrations:

```bash
cd apps/backend && npx prisma migrate dev
```

Start dev servers (two terminals from the repo root):

```bash
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:3000
```

---

## Development workflow

1. **Branch off `main`** with a short, descriptive name:
   ```
   feat/seller-analytics-export
   fix/cart-eco-points-rounding
   chore/upgrade-prisma-6
   ```

2. **Keep changes focused.** One feature, fix, or cleanup per PR. Mixing refactors with behaviour changes makes review hard and rollback harder.

3. **Write or update tests** for any behaviour change in the backend.

4. **Run the quality gates** before pushing (see below).

5. **Open a PR** using the template — fill in every section, including deployment notes if env vars or migrations changed.

---

## Code standards

### General

- Follow existing module boundaries — don't reach across layers.
- Keep API contracts explicit and fully typed.
- No magic strings — use constants or enums.
- Don't mix behaviour changes with formatting or refactoring in the same commit.

### Frontend

- All pages use `"use client"` where state or hooks are needed; keep RSC pages server-only otherwise.
- Auth guards: always check `isHydrated && user` before rendering protected content.
- Errors: use `ErrorState` with a retry handler; never swallow errors silently.
- Loading states: use `LoadingState` / `Skeleton` — no bare spinners.
- Destructive actions: always require `ConfirmDialog` before firing.

### Backend

- All controllers are guarded with `JwtAuthGuard` + `RolesGuard` unless explicitly public.
- Mutations on sensitive resources (KYC, refunds, balance, tiers) write an audit record.
- Use `PrismaService.$transaction` for multi-step writes that must be atomic.
- Validate all DTOs with class-validator — `ValidationPipe` is global and set to `whitelist: true`.

### What not to commit

- `.env` / `.env.local` — real secrets stay in the platform secret manager
- `apps/backend/public/uploads/` — local upload artefacts
- `apps/frontend/.next/` or `apps/backend/dist/` — build output
- Any file with credentials, tokens, or API keys

---

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat(seller): add CSV export for earnings history
fix(auth): clear stale cookie on 401 response
chore(deps): upgrade prisma to 6.1.0
docs(readme): update local setup steps
```

Types: `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `perf` · `ci`

Keep the subject line under 72 characters. Add a body if the _why_ isn't obvious.

---

## Pull request process

1. Make sure all quality gates pass locally before opening the PR.
2. Fill in the PR template fully — incomplete descriptions slow review.
3. Link any related issue with `Closes #123` in the PR description.
4. One approval is required to merge into `main`.
5. Squash-merge is preferred to keep the history clean.

---

## Quality gates

```bash
npm run lint:frontend      # ESLint — frontend
npm run lint:backend       # ESLint — backend
npm run test:backend       # Jest unit tests
npm run build:frontend     # Next.js production build
npm run build:backend      # NestJS production build
npm run audit:prod         # npm audit (prod deps only)
```

Run all in one shot:

```bash
npm run verify:ci
```

CI will block merge if any gate fails.

