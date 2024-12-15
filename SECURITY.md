# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| Older tagged releases | ❌ |

Security fixes are applied to `main` only. Always run the latest version.

---

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately via [GitHub Security Advisories](https://github.com/biratkdk/Earthlyn-Frontend/security/advisories/new).

Include as much detail as you can:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept, curl commands, screenshots)
- Affected component (auth, payments, messaging, file upload, etc.)
- Any suggested remediation, if you have one

You will receive an acknowledgement within **48 hours** and a status update within **7 days**.

---

## Security baseline

| Area | Control |
|---|---|
| Session tokens | HTTP-only cookies — never exposed to JavaScript |
| CSRF | Double-submit token on all state-changing requests |
| Access control | RBAC guards on every protected route and controller |
| Message content | AES-256 encrypted at rest |
| Password reset | Single-use tokens, hash-rotated on password change |
| Email verification | 24-hour expiry, SHA-256 hashed storage |
| Secrets validation | App refuses to start on missing, weak, or placeholder secrets |
| Audit trail | KYC decisions, refunds, balance changes, and tier overrides are logged |
| Dependencies | `npm audit` runs on every CI build |

---

## Secret handling

- Never commit real `.env` files, provider tokens, Stripe keys, SendGrid keys, database URLs, or passwords.
- Store production secrets in Vercel, Railway, Render, Neon, or the relevant provider secret manager.
- Rotate any credential that appears in chat, logs, local history, screenshots, or commits.

---

## Responsible disclosure

We ask that you:

- Give us reasonable time to investigate and fix before public disclosure
- Avoid accessing, modifying, or deleting data that isn't yours
- Not perform denial-of-service testing against production infrastructure

We commit to:

- Acknowledging your report promptly
- Keeping you informed of progress
- Crediting you in the release notes if you wish (after the fix ships)
