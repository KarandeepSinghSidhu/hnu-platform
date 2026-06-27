# Database

The app uses **SQLite** through **Prisma 7** with the `better-sqlite3` adapter. The database is a single file at **`prisma/dev.db`** locally. The schema lives in `prisma/schema.prisma`; the Prisma client is created in `src/lib/prisma.ts` (Prisma 7 requires an explicit adapter at runtime).

## The two-database gotcha (read this first)

`DATABASE_URL` resolves **relative to the current working directory**, and it must be:

```bash
DATABASE_URL="file:./prisma/dev.db"
```

The old default `file:./dev.db` creates a **second, empty** database at the repo root. The app then reads that empty file and the site / media library look empty even after a successful seed. `.env.example` already has the correct value — keep it. If you've hit this, see [troubleshooting.md](./troubleshooting.md#media-library-empty-after-seeding).

> A couple of standalone scripts (`prisma/seed.ts`, `prisma/seed-page-blocks.ts`) fall back to `file:./dev.db` **only if `DATABASE_URL` is unset**. As long as your `.env` sets `DATABASE_URL` correctly, every script and the app agree on one database.

## Create and sync the schema

For local development, sync the SQLite file directly to the schema:

```bash
npx prisma db push            # create/sync prisma/dev.db from prisma/schema.prisma
npx prisma generate           # regenerate the Prisma client (after schema changes)
```

### Why `db push`, not `migrate dev`

There are five migrations in `prisma/migrations/` (`...init` through `...add_page_builder`), but the live schema has since advanced via `db push`, so the migration history has **drifted**. Running `npx prisma migrate dev` detects the drift and prompts to **drop and recreate the database** — which wipes your seeded data.

| Use | When |
|-----|------|
| `npx prisma db push` | **Default for local dev.** Syncs the SQLite file to `schema.prisma` without touching migration history. |
| `npx prisma migrate dev` | Avoid here — it prints a destructive-reset prompt because of the drift. |

If you change `schema.prisma`, re-run `db push` (and `prisma generate` so the client types update).

## Seeding

| Command | Script | Behaviour |
|---------|--------|-----------|
| `npm run seed` | `prisma db seed` → `prisma/seed.ts` | **Wipes and reseeds** studies, team, partners, and publications, then calls `seedPageBlocks` to populate the page-builder tables (`Page` + `PageBlock`). Reproduces the full default site. |
| `npm run seed:pages` | `prisma/seed-page-blocks.ts` | Re-seeds page blocks only. **Idempotent — skips pages that already have blocks**, so admin edits are preserved. Set `RESEED_PAGES=1` to delete and recreate every page's blocks. |
| `npm run catalog:media` | `prisma/catalog-public-media.ts` | Indexes raster images under `/public` (skipping `uploads/`) into `MediaAsset` rows so they appear in the media library. Idempotent — skips paths already in the DB. |
| `npm run warm:translations` | `prisma/warm-translations.ts` | Generates and caches 中文 translations for the whole site. Safe no-op without `TRANSLATE_API_KEY`. See [environment.md](./environment.md#machine-translation). |

Force a full page re-seed (discards admin page edits):

```bash
RESEED_PAGES=1 npm run seed:pages
```

## Maintenance scripts

One-off backfills / migrations (rarely needed after a fresh seed):

| Command | Purpose |
|---------|---------|
| `npm run migrate:richtext` | Migrate block content to the rich-text format. |
| `npm run backfill:media-dims` | Fill in width/height on existing media assets. |
| `npm run backfill:published` | Backfill the published flag on pages. |
| `npm run backfill:inquiry-labels` | Backfill labels on existing contact inquiries. |
| `npm run backfill:studies-links` | Re-point legacy study links to their current routes. |
| `npm run cleanup:studies-contact-card` | Remove the deprecated contact card from study layouts. |
| `npm run reset:study-template` | Reset the default study-layout template blocks. |

## How scripts load env vars

This matters because the wrong `DATABASE_URL` is the top onboarding bug — keep it identical in `.env` and `.env.local`.

| Consumer | Loads | Notes |
|----------|-------|-------|
| Next.js app (`dev`, `build`, `start`) | `.env.local` then `.env` | Next's normal precedence: `.env.local` wins. |
| Prisma CLI (`db push`, `generate`, `migrate`) | `.env.local` then `.env` | `prisma.config.ts` imports `prisma/load-env.ts` (Prisma 7 stopped auto-loading env files), then reads `env("DATABASE_URL")`. |
| `seed.ts`, `seed-page-blocks.ts`, `catalog-public-media.ts` | `.env` only | They `import "dotenv/config"` at the top. |
| `warm-translations.ts` | `.env.local` then `.env` | Imports `prisma/load-env.ts`, so it picks up `TRANSLATE_API_KEY` from `.env.local`. |

## Resetting the database

```bash
rm prisma/dev.db
npx prisma db push
npm run seed
npm run catalog:media
```

## Notable models

The schema (`prisma/schema.prisma`) holds 17 models. Most are self-explanatory (`Study`, `TeamMember`, `Page`, `PageBlock`, `MediaAsset`, …) and carry inline comments. Two publication-sync models are worth calling out:

### `PublicationFilterSetting`

The admin-editable **relevance filter** the ORCID/OpenAlex sync applies to each work. Expected to be a **singleton** (one row, `id = 1`); list fields are newline/comma-separated text (SQLite has no array type) parsed by `parseLines()` in `src/lib/publication-filter.ts`. Besides the keyword/affiliation lists (`affiliationPhrases`, `institutionRors`, `strongKeywords`, `weakKeywords`, `exclusionKeywords`) and `minYear`, it holds **five route columns** that decide which bucket each kind of match lands in — each stores `"Approved" | "Pending" | "Rejected"`:

| Column | Match it routes | Default |
|--------|-----------------|---------|
| `routeUnitAffiliation` | Affiliation literally names the unit (e.g. "Human Nutrition Unit") | `Approved` |
| `routeInstitutionKeyword` | Accepted institution (ROR) **and** a strong keyword | `Pending` |
| `routeStrongKeywords` | Two or more strong keywords, no affiliation | `Pending` |
| `routeWeakMatch` | Faint signal (institution-only, single strong keyword, or weak keywords) | `Pending` |
| `routeExclusion` | Off-topic / exclusion term with no strong signal | `Rejected` |

The defaults encode an **affiliation-only auto-approval** policy: only a unit-name match auto-approves; every other positive signal waits in `Pending`. Admins edit these on `/admin/publications`. The hard year cutoff and the no-signal case are always `Rejected` (not routable).

### `DeletedPublication` (tombstone)

A tombstone written when an admin **hard-deletes** a publication (`DELETE /api/admin/publications/[id]`, in the same transaction as the delete). On its next run the ORCID/OpenAlex sync (`src/app/api/admin/publications/sync/route.ts`) consults these and **skips re-creating** any synced work that matches one — so a deletion survives the next sync instead of silently reappearing.

| Field | Purpose |
|-------|---------|
| `sourceType`, `sourceId` | Composite source identity of the deleted row (e.g. `ORCID` + `"${orcidId}:${putCode}"`); `sourceId` may be null. |
| `doi` | Normalized (trim + lowercase) DOI of the deleted row, if any. |
| `titleYearKey` | `buildPublicationDedupKey(title, year)` — survives put-code/DOI drift across re-imports. |
| `title`, `year` | Retained for admin auditing only. |
| `deletedAt` | When the tombstone was written. |

A synced work is skipped when **any** of three signals matches a tombstone: the composite `{sourceType, sourceId}`, the normalized DOI, or the `titleYearKey`. (The skip only applies when there is no live row to update — an admin re-adding the paper creates a live row, which legitimately wins.)

## Inspecting data

```bash
npx prisma studio             # browse/edit rows in a local GUI
```

## Related

- [environment.md](./environment.md) — env var reference and precedence
- [setup.md](./setup.md) — the full onboarding flow
- [admin-cms.md](./admin-cms.md) — how editors change this data at runtime
