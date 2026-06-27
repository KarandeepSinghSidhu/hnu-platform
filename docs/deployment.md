# Deployment

Stack-specific facts for building and hosting this app, plus a readiness checklist. The constraints here come from the storage layer, not Next.js per se.

> **Current deployment.** The site is live on **Render** at <https://hnu-auckland.onrender.com> (a Node server with file-SQLite on a persistent disk), hosted under the team's account for the course. The third-party services it depends on are currently provisioned under the team's personal accounts — moving them to the client is covered in [Production handover](#production-handover) below. Reference for the framework side: `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`.

## The stack determines the host

| Layer | Implication for hosting |
|-------|-------------------------|
| Next.js 16 (App Router, mostly `force-dynamic`) | Runs as a long-lived **Node.js server** (`next build` → `next start`) or a Docker container. Not a good fit for static export. |
| Prisma 7 + **`better-sqlite3`** | `better-sqlite3` is a **native module** — it must be built/installed on the host's platform (don't ship a macOS build to a Linux box). |
| **File-based SQLite** (`prisma/dev.db`) | The database is a **file on disk**. It needs a **persistent, writable** volume that survives restarts/redeploys. |
| Runtime image uploads (`public/uploads/`) | Also written to disk at runtime → also needs persistent storage. |

### Why default serverless / Vercel is a poor fit

Serverless platforms (including Vercel's default target) give each invocation an **ephemeral filesystem**. With file SQLite that means:

- The `prisma/dev.db` you deployed is read-only / reset between cold starts — writes vanish or fail.
- `public/uploads/` (runtime media) doesn't persist either.

So the database and uploads would effectively reset. This app wants a host with a **persistent disk**.

### Hosting options that work

- **A persistent-disk platform:** Fly.io (a volume), Railway (a volume), or Render (a disk). Build the native module on the host and point `DATABASE_URL` at a file on the mounted volume.
- **A VPS / Docker** (any Node 20+ box): full control of disk and the native build. The Next.js docs list Node-server and Docker as supporting all features.
- **Serverless-friendly alternative — swap the DB.** If you specifically want serverless, move off file SQLite to **libSQL / Turso** via `@prisma/adapter-libsql` (a hosted SQLite-compatible DB over HTTP). That's a code + adapter change, not just config — out of scope for this doc, but the cleanest path to serverless.

## Build & run (Node server)

```bash
npm ci                  # install deps (builds better-sqlite3 for this host)
npx prisma generate     # generate the Prisma client
npx prisma db push      # or `migrate deploy` — create/sync the schema on the volume
npm run seed            # first deploy only: seed content (see note below)
npm run build           # next build
npm run start           # next start (serves the production build)
```

`package.json` already defines `build` (`next build`) and `start` (`next start`), which is all a Node host needs.

> **`db push` vs `migrate deploy`.** Locally the team uses `prisma db push` because the committed migration history has drifted (see [database.md](./database.md)). For a server you can use either: `db push` to sync the schema to the file, or `prisma migrate deploy` if you've reconciled the migration history first. Pick one and be consistent. Run **seeds only on the first deploy** (or guard them) — re-running `npm run seed` **wipes and reseeds** content and would clobber admin edits.

## Readiness checklist

Storage:

- [ ] **SQLite on a persistent volume**, referenced by an **absolute path** in `DATABASE_URL` (e.g. `file:/data/app.db`). Don't rely on a CWD-relative path like `file:./prisma/dev.db` in production.
- [ ] **`public/uploads/` on persistent storage** (or a mounted volume) so runtime media survives redeploys.
- [ ] A **backup** of the SQLite file (and uploads). It's a single file — snapshot/copy it on a schedule.
- [ ] `better-sqlite3` built on the **host platform** (`npm ci` on the host, or a matching Docker base image).

Schema & data:

- [ ] `prisma generate` run during build; `prisma db push` (or `migrate deploy`) run against the volume DB on deploy.
- [ ] Seeds run once / guarded so deploys don't overwrite content.

Secrets & config (platform env — never commit real values; see [environment.md](./environment.md)):

- [ ] **`ADMIN_PASSWORD`** — strong, not the `change-me` placeholder.
- [ ] **`ADMIN_SESSION_SECRET`** — long random string (signs the admin JWT).
- [ ] **`DATABASE_URL`** — absolute `file:` path on the persistent volume.
- [ ] **`NEXT_PUBLIC_SITE_URL`** — set to the deployed origin for canonical metadata/SEO (default `http://localhost:3000` is wrong in prod).
- [ ] **`ALLOW_INDEXING`** — leave **unset** for test/staging deploys (serves a deny-all `robots.txt` + site-wide `noindex` so the site stays out of search engines). Set to `1` only at the official public launch.
- [ ] **`TRANSLATE_API_KEY`** (+ `TRANSLATE_REGION` for Azure) — only if 中文 machine translation of page copy is wanted; otherwise ZH falls back to English. Run `npm run warm:translations` after deploy to populate the cache.
- [ ] **`RESEND_API_KEY`** + **`EMAIL_FROM`** (on a domain **verified in Resend**) — for contact-form email delivery. Without them, submissions are still saved; email is skipped.

Serving:

- [ ] **HTTPS** in front of the app (the `admin_session` cookie is `secure` in production).
- [ ] Node **20+** runtime.

## Production handover

The live deployment runs on **the team's own third-party accounts**, set up for the course. To hand the site over to the Human Nutrition Unit, each of these needs to move to an account the client controls. None of it is hard-coded — it's all environment configuration (see [environment.md](./environment.md#reference)) — but the underlying accounts must be transferred or re-provisioned.

| Service | Current state | Handover action |
|---------|---------------|-----------------|
| **Hosting (Render)** | Deployed at `hnu-auckland.onrender.com` on a team member's Render account, with a persistent disk holding the SQLite DB and `public/uploads/`. | Recreate the service under the client's own host account (Render or any persistent-disk Node host — see [Hosting options](#hosting-options-that-work)). Copy the SQLite file + uploads across, set the env vars below, and keep the disk backed up. |
| **Custom domain** | None attached; the site serves on the temporary `*.onrender.com` host, and `NEXT_PUBLIC_SITE_URL` is unset. | Attach the client's domain (e.g. an `hnu.auckland.ac.nz` subdomain) at the host, then set `NEXT_PUBLIC_SITE_URL` to it. `next.config.ts` already 301-redirects the `*.onrender.com` host to the canonical domain once that's set. |
| **Email (Resend)** | A **personal Resend account** on the shared **test sender** (`onboarding@resend.dev`), which delivers only to the account owner — no domain is verified, so any other recipient gets a `403`. | Move to the client's Resend account, **verify a domain they control** (add the DNS records), set `EMAIL_FROM` to an address on it, and keep `RESEND_API_KEY` set. Then set the recipient per enquiry category in the admin console. See [environment.md](./environment.md#contact-form-email-resend). |
| **Machine translation (Azure)** | `TRANSLATE_API_KEY` is an **Azure Translator resource under a personal Azure account** created for the project (Azure is the default provider; ~2M chars/month free tier). | Provision an Azure Translator resource under the client's Azure account, set `TRANSLATE_API_KEY` (+ `TRANSLATE_REGION`), then run `npm run warm:translations`. Or switch `TRANSLATE_PROVIDER` to `google`/`deepl` with their key. See [environment.md](./environment.md#machine-translation). |
| **Admin credentials** | `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` are set per-deployment. | Set fresh, strong values in the client's environment (don't reuse the course values). |
| **Database (content)** | The SQLite file on the host's disk is the **source of truth** for live content — studies, team, publications, pages, and uploaded media. | Copy the live DB file **and** `public/uploads/` to the new host. **Do not** re-run `npm run seed` against it — that wipes and reseeds, clobbering real content. Keep scheduled backups. |
| **OpenAlex / ORCID** | Public APIs, no account or key required. `OPENALEX_MAILTO`, if set, may be a developer's email (only opts into OpenAlex's faster "polite pool"). | Optionally set `OPENALEX_MAILTO` to a client/team address. Nothing to transfer. |

## Related docs

- [environment.md](./environment.md) — every variable, what reads it, and `.env` vs `.env.local`.
- [database.md](./database.md) — Prisma/SQLite workflow, seeds, `db push` vs `migrate`.
- [architecture.md](./architecture.md) — why pages are `force-dynamic` and how the block pipeline renders.
- [contributing.md](./contributing.md) — pre-PR checks and conventions.
