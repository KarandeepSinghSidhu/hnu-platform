# Troubleshooting

Common onboarding and runtime issues, with the fix and where to read more.

## FAQ

| Symptom | Cause | Fix |
|---------|-------|-----|
| **Study pages 404** (site loads, but `/studies/<name>` is missing) | The database wasn't seeded, so there are no study rows or page blocks. | Run `npm run seed`, then restart `npm run dev`. See [setup.md](./setup.md#4-seed-content). |
| **Media library empty after seeding** (and pages look blank) | `DATABASE_URL` points at `file:./dev.db`, creating a second, empty DB at the repo root instead of the seeded `prisma/dev.db`. | Set `DATABASE_URL="file:./prisma/dev.db"` in `.env`, then re-run `npm run seed` and `npm run catalog:media`. See [database.md](./database.md#the-two-database-gotcha-read-this-first). |
| **`prisma migrate dev` wants a destructive reset** | The committed migration history has drifted from the live schema (the schema advanced via `db push`). | Use `npx prisma db push` instead — it syncs the schema without touching migration history. See [database.md](./database.md#why-db-push-not-migrate-dev). |
| **`prisma db push` fails with an empty schema-engine error** (fresh clone, before the DB exists) | On the Prisma 7 / `better-sqlite3` toolchain, `db push` can error when the target SQLite file doesn't exist yet. | Create the empty file first with `touch prisma/dev.db`, then re-run `npx prisma db push`. |
| **中文 shows English for page copy** (nav/footer do switch) | Machine translation isn't enabled, or the cache hasn't been warmed. Admin-authored page copy falls back to English without a key. | Set `TRANSLATE_API_KEY` (and `TRANSLATE_REGION` for Azure) in `.env.local`, then run `npm run warm:translations`. See [environment.md](./environment.md#machine-translation). |
| **Contact emails not arriving** | `RESEND_API_KEY` is unset (the send is logged and skipped), or `EMAIL_FROM` isn't on a Resend-verified domain. | Set `RESEND_API_KEY` and an `EMAIL_FROM` on a verified domain in `.env.local`. The submission is saved regardless. See [environment.md](./environment.md#contact-form-email-resend). |
| **"Which file renders this section?"** | Page content comes from the page-block model, not hardcoded JSX. | See [content-editing.md](./content-editing.md) for the section-to-file/block mapping. |
| **Port 3000 already in use** | Another process is using the port. | Next.js automatically picks the next free port and prints it. To free 3000: `lsof -ti:3000 \| xargs kill`. |
| **`Missing DATABASE_URL`** thrown at startup | No `.env` file (a fresh clone ships only `.env.example`), or `DATABASE_URL` is blank. | `cp .env.example .env`. See [setup.md](./setup.md#2-create-your-env-file). |
| **`Missing ADMIN_SESSION_SECRET`** when hitting the admin console | `ADMIN_SESSION_SECRET` is unset. | Set it to a long random string in `.env`. See [environment.md](./environment.md#reference). |
| **Admin login returns "Server auth config is missing or too weak"** | `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` are unset, too short, or still the `.env.example` placeholders. | Set `ADMIN_PASSWORD` (≥ 12 chars) and `ADMIN_SESSION_SECRET` (≥ 32 chars) to real values — not `change-me` / `replace-with-…`. See [setup.md](./setup.md#2-create-your-env-file). |
| **Schema changes don't show up** (or Prisma types are stale) | The Prisma client wasn't regenerated after editing `schema.prisma`. | Run `npx prisma db push` then `npx prisma generate`. See [database.md](./database.md#create-and-sync-the-schema). |

## Still stuck?

- Start over with a clean database: see [database.md](./database.md#resetting-the-database).
- Re-check your env file against [environment.md](./environment.md#reference).
- Walk the full onboarding flow again: [setup.md](./setup.md).
