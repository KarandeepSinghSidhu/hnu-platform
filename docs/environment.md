# Environment variables

All configuration is via environment variables. A fresh clone ships **only `.env.example`** (the real `.env*` files are gitignored), so step one is `cp .env.example .env`. The defaults work for local development.

## `.env` vs `.env.local` precedence

Different consumers load env files differently. The key rule: **keep `DATABASE_URL` identical in `.env` and `.env.local`** if you create both.

| Consumer | Loads | How |
|----------|-------|-----|
| Next.js app (`dev`, `build`, `start`) | `.env.local` then `.env` | Built-in Next.js precedence — `.env.local` wins. |
| Prisma CLI (`db push`, `generate`, `migrate`) | `.env.local` then `.env` | `prisma.config.ts` imports `prisma/load-env.ts` (Prisma 7 stopped auto-loading env files), then reads `env("DATABASE_URL")`. |
| `seed.ts`, `seed-page-blocks.ts`, `catalog-public-media.ts` | `.env` only | They `import "dotenv/config"`. |
| `warm-translations.ts` | `.env.local` then `.env` | Imports `prisma/load-env.ts` (loads `.env.local` first, so it picks up `TRANSLATE_API_KEY`). |

In practice: put `DATABASE_URL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in `.env`; put real secrets like `TRANSLATE_API_KEY` and `RESEND_API_KEY` in `.env.local`.

## Reference

`Required` = the app/scripts won't work without it. Everything else is optional and degrades gracefully.

| Variable | Required | Default | Read by | Purpose |
|----------|----------|---------|---------|---------|
| `DATABASE_URL` | **Yes** | `file:./prisma/dev.db` (in `.env.example`) | `src/lib/prisma.ts`, all scripts, Prisma CLI | SQLite path. **Must** be `file:./prisma/dev.db` — see warning below. |
| `ADMIN_PASSWORD` | **Yes (for admin)** | — | `src/app/api/admin/auth/login/route.ts` | Plain-string password for the admin console login. **Must be ≥ 12 chars; the `change-me` placeholder is rejected as too weak.** |
| `ADMIN_SESSION_SECRET` | **Yes (for admin)** | — | `src/lib/admin-session.ts` | Secret that signs the admin session cookie (JWT). **Must be ≥ 32 chars** (e.g. `openssl rand -hex 32`); the `replace-with-…` placeholder is rejected. |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | `src/lib/constants.ts` (metadata/SEO) | Canonical public site URL. Leave blank locally. |
| `ALLOW_INDEXING` | No | unset | `src/app/robots.ts`, `src/app/layout.tsx` | **Unset → deny-all `robots.txt` + site-wide `noindex`** so test/staging deploys stay out of Google. Set to `1` only at the official public launch. |
| `ORCID_API_BASE_URL` | No | `https://pub.orcid.org/v3.0` (production) | `src/lib/orcid.ts` | Public ORCID API base — **no auth required**. Override to the sandbox for testing. |
| `OPENALEX_API_BASE_URL` | No | `https://api.openalex.org` | `src/lib/openalex.ts` | OpenAlex API base (per-paper affiliation data). Override for tests/proxies. |
| `OPENALEX_MAILTO` | No | unset | `src/lib/openalex.ts` | Contact email sent to OpenAlex to opt into its faster "polite pool". |
| `RESEND_API_KEY` | No | unset | `src/lib/email.ts` | Resend API key for contact-form email. **Unset → emails are logged and skipped** (no network calls). |
| `EMAIL_FROM` | No | `HNU Website <onboarding@resend.dev>` | `src/lib/email.ts` | The "from" address. For real delivery, must be on a domain verified in Resend. |
| `TRANSLATE_PROVIDER` | No | `azure` | `src/lib/translate/provider.ts` | Machine-translation provider: `azure` \| `google` \| `deepl`. |
| `TRANSLATE_API_KEY` | No | unset | `src/lib/translate/provider.ts` | Translation API key. **Unset → no translation; page copy falls back to English.** |
| `TRANSLATE_REGION` | No | unset | `src/lib/translate/provider.ts` | Azure only — resource region (e.g. `australiaeast`). Omit for a "Global" resource. |
| `TRANSLATE_ENDPOINT` | No | per-provider host | `src/lib/translate/provider.ts` | Override the API host (tests/proxies/self-hosted). |
| `RESEED_PAGES` | No | unset | `prisma/seed-page-blocks.ts` | Set to `1` to force `seed:pages` to delete and recreate every page's blocks. |

> **`ORCID_CLIENT_ID` / `ORCID_CLIENT_SECRET` are not used anywhere.** The public ORCID API needs no authentication, so there is no OAuth client to configure. Don't add them.

> **`DATABASE_URL` must be `file:./prisma/dev.db`.** The old default `file:./dev.db` creates a second, empty database at the repo root, making the site and media library look empty even after seeding. See [database.md](./database.md#the-two-database-gotcha-read-this-first).

## Machine translation

The 中文 toggle always switches the **fixed UI** (nav, footer, forms — from `src/messages/{en,zh}.ts`). **Admin-authored page copy** (hero titles, card text, page bodies) is machine-translated and cached in the database; with no `TRANSLATE_API_KEY` it falls back to English. **Study content** is never machine-translated — it uses manual, board-approved Chinese entered in the admin console (ethics requirement).

How the cache works:

- Translation runs at **publish time** (when an admin publishes a page) or via `npm run warm:translations` — **never on a normal page view**. The public site only reads cached translations, so it renders Chinese instantly and works even with no key present at runtime.
- A translation is reused until its English source changes, so the API is called once per unique string, not per visit.
- Without a key, cache-warming is a safe no-op (`getProvider()` returns `null`); the render falls back to English for anything uncached.

To enable it:

```bash
# .env.local
TRANSLATE_PROVIDER="azure"        # azure (default) | google | deepl
TRANSLATE_API_KEY="your-key-here"
TRANSLATE_REGION="australiaeast"  # Azure only; omit for a "Global" resource
```

```bash
npm run warm:translations         # translate + cache the whole site once
```

> Only **Azure** (the default, ~2M chars/month free) is exercised in this project. Google and DeepL implement the same interface and are ready, but are unverified until their key is supplied. Switching providers is a one-line change to `TRANSLATE_PROVIDER`.

> **Handover:** the `TRANSLATE_API_KEY` currently in use is an Azure Translator resource under a **personal Azure account** set up for the course. For production, provision the resource under the client's own Azure account — see [Production handover](./deployment.md#production-handover).

## Contact-form email (Resend)

The public contact form always **saves** the submission. The email notification is best-effort:

- **`RESEND_API_KEY` unset** → the notification is logged to the console and skipped (no network calls — ideal for dev/CI).
- **`RESEND_API_KEY` set** → an email is sent. For real delivery, set `EMAIL_FROM` to an address on a **domain verified in Resend**. Without it, the app uses Resend's shared test sender (`onboarding@resend.dev`), which can only deliver to the address that owns your Resend account.

Not receiving emails? See [troubleshooting.md](./troubleshooting.md#contact-emails-not-arriving).

## Related

- [setup.md](./setup.md) — onboarding flow
- [database.md](./database.md) — DB workflow and the two-database gotcha
- [troubleshooting.md](./troubleshooting.md) — common issues
