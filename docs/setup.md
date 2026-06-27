# Setup

Local onboarding for the HNU Auckland website + CMS. The flow below is **idempotent** — safe to re-run if a step fails or you want a clean slate.

## Prerequisites

- **Node.js ≥ 22.17.1** (declared in `package.json` `engines`; the toolchain targets `@types/node` v22). The version is pinned in `.nvmrc` — run `nvm use` if you use nvm.
- npm (bundled with Node)
- A POSIX-ish shell. Windows users: use PowerShell and substitute `copy` for `cp`.

## Steps

A fresh clone ships **only `.env.example`** — the real `.env*` files are gitignored. Step 2 creates your local `.env`.

### 1. Install dependencies

```bash
npm install
```

### 2. Create your env file

```bash
cp .env.example .env          # Windows PowerShell: copy .env.example .env
```

The defaults in `.env.example` work out of the box for local development — notably `DATABASE_URL="file:./prisma/dev.db"`, which is already correct (see the warning below). **Before the admin console will let you in, replace the two admin placeholders:** set `ADMIN_PASSWORD` to a password of **at least 12 characters** and `ADMIN_SESSION_SECRET` to a random string of **at least 32 characters** (e.g. `openssl rand -hex 32`). The shipped placeholders (`change-me`, `replace-with-a-long-random-string`) are deliberately rejected as too weak, so leaving them gives a *"Server auth config is missing or too weak"* error at login. Full reference: [environment.md](./environment.md).

> **Do not change `DATABASE_URL` to `file:./dev.db`.** That points at a *second*, empty database at the repo root, so the site and media library look empty even after seeding. Keep it as `file:./prisma/dev.db`. This is the most common onboarding bug — [troubleshooting.md](./troubleshooting.md).

### 3. Create and sync the database schema

```bash
npx prisma db push            # creates/syncs prisma/dev.db from the schema
npx prisma generate           # generates the Prisma client
```

> **Use `db push`, not `prisma migrate dev`.** The committed migration history has drifted from the live schema, so `migrate dev` prints a destructive-reset prompt. `db push` syncs the SQLite file to `prisma/schema.prisma` without touching migration history. See [database.md](./database.md).

> **If `db push` errors out with an empty schema-engine message** on a fresh clone, the SQLite file may not exist yet. Create it first with `touch prisma/dev.db`, then re-run `npx prisma db push`. See [troubleshooting.md](./troubleshooting.md).

### 4. Seed content

```bash
npm run seed                  # wipes + reseeds studies, team, partners, publications, and page blocks
npm run catalog:media         # indexes raster images under /public into the media library
```

`npm run seed` runs `prisma/seed.ts`, which also calls `seedPageBlocks` to populate the page-builder tables — so after this the homepage and all section content render from the database. `npm run catalog:media` adds the existing `/public` images to the media library so they appear in the admin's image picker.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public site, and [http://localhost:3000/admin](http://localhost:3000/admin) to log in to the admin console with your `ADMIN_PASSWORD`.

> **Port 3000 in use?** Next.js automatically picks the next free port (and prints it). To free 3000 instead: `lsof -ti:3000 | xargs kill`.

## All in one

```bash
npm install
cp .env.example .env
npx prisma db push
npx prisma generate
npm run seed
npm run catalog:media
npm run dev
```

## Optional: enable 中文 machine translation

Out of the box, the language toggle switches the fixed UI (nav, footer, forms) to Chinese, but admin-authored page copy falls back to English because no translation key is set. To translate page copy:

1. Add `TRANSLATE_API_KEY` (and for Azure, `TRANSLATE_REGION`) to `.env.local`.
2. Run `npm run warm:translations` to generate and cache translations for the whole site.

See [environment.md](./environment.md#machine-translation) for providers and how the cache works.

## Resetting your local database

To start completely fresh, delete the SQLite file and re-run the schema + seed steps:

```bash
rm prisma/dev.db
npx prisma db push
npm run seed
npm run catalog:media
```

## Next steps

- [architecture.md](./architecture.md) — how the codebase is organised
- [content-editing.md](./content-editing.md) — which file renders which section
- [admin-cms.md](./admin-cms.md) — using the admin console
- [troubleshooting.md](./troubleshooting.md) — if something looks wrong
