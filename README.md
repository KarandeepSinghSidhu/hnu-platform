# HNU Auckland

The public website and content-management system (CMS) for the University of Auckland's **Human Nutrition Unit** — a marketing site for the unit and its research, plus an admin console for staff to edit page content, manage studies/team, and sync publications.

Highlights: a block-based page builder with draft/publish and EN/中文 translation, a media library, **site-wide search** (navbar → pages, studies, team, publications, and page content), and an ORCID/OpenAlex **publications sync** with admin-configurable **auto-sorting** (Approved/Pending/Rejected routing) and durable **tombstone deletes** that survive re-sync.

## Links

- **Live site:** <https://hnu-auckland.onrender.com> — the admin console is at [`/admin`](https://hnu-auckland.onrender.com/admin).
- **Project management:** [GitHub Project board #42](https://github.com/orgs/uoa-compsci399-s1-2026/projects/42) and the repo's [GitHub Issues](https://github.com/uoa-compsci399-s1-2026/capstone-project-s1-2026-team-24/issues).
- **Final report:** [HNU Auckland — Final Group Report (Team 24)](https://drive.google.com/file/d/1YFgefgupj3O3petcMLEUPFPCouzHwhyb/view?usp=sharing) (Google Drive).

## Tech stack

| Layer | Choice |
|-------|--------|
| Languages | TypeScript, JavaScript, CSS |
| Framework | Next.js **16.2.7** (App Router) |
| UI | React **19.2.4** |
| Styling | Tailwind CSS **v4** — config lives in `@theme` in `src/app/globals.css` (**no `tailwind.config.js`**) |
| Database | SQLite via Prisma **7.7.0** with the `@prisma/adapter-better-sqlite3` **7.7.0** driver adapter |
| Rich text | Tiptap **3.23.6** |
| Search | Fuse.js **7.4.1** |
| Auth | `jose` **6.2.2** — signed admin-session cookies |
| Drag & drop | dnd-kit — page-editor block reordering |
| Email | Resend **6.12.4** — contact-form notifications |
| Tests | Vitest **4.1.4** + Playwright **1.59.1**; Storybook **10.3.5** for components |

## Prerequisites

- **Node.js ≥ 22.17.1** (declared in `package.json` `engines`; the toolchain targets `@types/node` v22). The pinned version is in `.nvmrc` — run `nvm use` if you use nvm.
- npm (ships with Node)

## Quickstart

A fresh clone has **no `.env*` file** (they are gitignored; only `.env.example` ships), so the first step is to create one.

```bash
npm install
cp .env.example .env          # DATABASE_URL is already correct in the example
npx prisma db push            # create/sync the SQLite schema at prisma/dev.db
npx prisma generate           # generate the Prisma client
npm run seed                  # seed studies/team/partners/publications + page blocks
npm run catalog:media         # index /public images into the media library
npm run dev                   # http://localhost:3000
```

> **Use `npx prisma db push`, not `prisma migrate dev`.** The committed migration history has drifted from the live schema, so `migrate dev` prints a scary destructive-reset prompt. `db push` syncs the schema safely. See [`docs/database.md`](./docs/database.md).

> **If `db push` errors with an empty schema-engine message on a fresh clone**, the SQLite file may not exist yet — run `touch prisma/dev.db` first, then re-run `db push`. See [`docs/troubleshooting.md`](./docs/troubleshooting.md).

> **Keep `DATABASE_URL` as `file:./prisma/dev.db`.** The old default `file:./dev.db` creates a *second*, empty database at the repo root, making the site and media library look empty even after seeding. This is the #1 onboarding bug — see [`docs/troubleshooting.md`](./docs/troubleshooting.md).

The admin console lives at [http://localhost:3000/admin](http://localhost:3000/admin). Log in with the `ADMIN_PASSWORD` you set in `.env`. **Set real values first:** `ADMIN_PASSWORD` must be ≥ 12 characters and `ADMIN_SESSION_SECRET` ≥ 32 characters — the `.env.example` placeholders are deliberately rejected as too weak, so the login returns *"Server auth config is missing or too weak"* until you replace them.

## Usage examples

**Public visitors** can browse the HNU information pages, search across pages, studies, team, and publications from the navbar, switch between English and 中文, view current studies and download their PDFs, and submit a contact enquiry.

**Admins** (at `/admin`) can:

- edit page content with reusable blocks, using draft preview, publish, discard, and revision-restore;
- manage studies, study PDFs and per-study layouts, team members, partner logos, media assets, and contact submissions;
- sync publications from ORCID, enrich them with OpenAlex affiliation data, and triage the Approved/Pending/Rejected buckets;
- warm cached 中文 translations for admin-authored copy when a translation key is configured.

## npm scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the Next.js dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run clean` | Remove the `.next` build cache |
| `npm run lint` | Run ESLint |
| `npm run seed` | Wipe + reseed studies/team/partners/publications **and** page blocks |
| `npm run seed:pages` | Re-seed page blocks (preserves existing pages unless `RESEED_PAGES=1`) |
| `npm run catalog:media` | Index raster images under `/public` into the media library |
| `npm run warm:translations` | Generate + cache 中文 translations (needs `TRANSLATE_API_KEY`) |
| `npm run migrate:richtext` | One-off migration of block content to rich text |
| `npm run backfill:media-dims` | Backfill width/height on media assets |
| `npm run backfill:published` | Backfill the published flag on pages |
| `npm run verify` | Pre-PR gate: `tsc --noEmit` + ESLint + the API Vitest project |
| `npm run test` | Unit tests (`vitest run`) |
| `npm run test:e2e` | End-to-end tests (`playwright test`, incl. an admin smoke test) |
| `npm run test:e2e:update` | Update Playwright snapshots |
| `npm run storybook` | Run Storybook (port 6006) |
| `npm run build-storybook` | Build the static Storybook |

## Languages & translation (English / 中文)

The navbar has a language toggle that switches between English and Simplified Chinese. There are **three kinds of text**, handled differently:

| Text | Examples | How it translates |
|------|----------|--------------------|
| **Fixed interface text** | nav, footer, buttons, form labels, Collaborations / Studies / Contact / Team section copy | Built-in dictionary (`src/messages/en.ts` & `zh.ts`). **Always works — no setup.** |
| **Admin-authored page copy** | hero titles, info-card & callout text, page bodies | **Machine-translated and cached** at publish/warm time. Needs `TRANSLATE_API_KEY`; otherwise **falls back to English.** |
| **Individual study pages** | a study's description, eligibility, compensation | **Manual, board-approved translations** entered in the admin console. **Never machine-translated** (ethics requirement). |

By default no translation key is set, so switching to 中文 shows Chinese for the fixed UI and English for admin-authored page copy until you add a key and warm the cache. To enable it, set `TRANSLATE_API_KEY` (and for Azure, `TRANSLATE_REGION`) then run `npm run warm:translations`. Full details, providers, and the caching model: [`docs/environment.md`](./docs/environment.md) and [`docs/content-editing.md`](./docs/content-editing.md).

## Contact-form email (Resend)

The public contact form sends notifications through [Resend](https://resend.com). **It currently runs on Resend's shared test sender** (`onboarding@resend.dev`, the default when `EMAIL_FROM` is unset), which can only deliver to the address that owns the Resend account. Sending to any other recipient returns a `403` *"testing domain restriction"* error, because no custom domain is verified yet (the site is self-hosted for now).

**To enable delivery to real recipients — a handover step:**

1. Verify a domain you control in Resend by adding the DNS records it provides (see <https://resend.com/domains>). For a University address, that means a domain the HNU/UoA team controls.
2. Set `EMAIL_FROM` to an address on that verified domain (e.g. `HNU Website <noreply@your-domain>`).
3. Keep `RESEND_API_KEY` set, then set the recipient address per enquiry category in the admin console.

Either way, **every submission is saved** to the admin console (`/admin/contacts`) regardless of email delivery, so no enquiry is lost even when sending is restricted or disabled. Full env reference: [`docs/environment.md`](./docs/environment.md#contact-form-email-resend).

## Documentation

Project docs live in [`docs/`](./docs) — start with the [docs index](./docs/README.md).

| Doc | Covers |
|-----|--------|
| [Architecture](./docs/architecture.md) | How the app is structured (App Router, blocks, data flow) |
| [Setup](./docs/setup.md) | Local onboarding, step by step |
| [Database](./docs/database.md) | Prisma/SQLite workflow, seeds, `db push` vs `migrate dev` |
| [Environment](./docs/environment.md) | Every env var, what reads it, and `.env` vs `.env.local` |
| [Content editing](./docs/content-editing.md) | Which file renders which section; page-block model |
| [Styling](./docs/styling.md) | Tailwind v4 `@theme`, brand colours |
| [Admin CMS](./docs/admin-cms.md) | Admin console: pages, studies, team, partners, publications |
| [Troubleshooting](./docs/troubleshooting.md) | FAQ for common onboarding issues |
| [Deployment](./docs/deployment.md) | Building and hosting (file-SQLite considerations) |
| [Contributing](./docs/contributing.md) | Conventions, tests, PR workflow |

## Future plans

Ideas and known limitations we'd tackle in a future release:

- **Move off file-based SQLite.** The app currently runs on a single SQLite file on a persistent volume, which ties it to one instance. Migrating to managed Postgres (or libSQL/Turso) would let it scale horizontally and fit serverless hosting. See [`docs/deployment.md`](./docs/deployment.md).
- **Re-enable image optimization.** Next's image optimizer is turned off (`images.unoptimized`) because `sharp` OOMs on the 512&nbsp;MB Render Starter plan. A larger plan or an external image CDN would let us turn it back on.
- **Finish retiring the legacy `/studies` overview.** The index page was removed in favour of the navbar Studies dropdown, but a deprecated route is still reachable and should be cleaned up with proper redirects.
- **Broaden machine translation.** Extend 中文 coverage and add an in-admin translation review/QA workflow so editors can proof machine output before publish.
- **Continuous integration.** Re-introduce automated CI (the existing `npm run verify` + test suite) once GitHub Actions is available for the org.
- **Ongoing accessibility & SEO polish.**

## Acknowledgements

- **Human Nutrition Unit, University of Auckland** — our client, for the brief, content, and feedback throughout the project.
- **COMPSCI 399 (Capstone)** teaching team and our project mentor.
- Built by **Team 24** — see the repository's contributor history for the development team.
- Open-source projects this is built on: [Next.js](https://nextjs.org), [React](https://react.dev), [Prisma](https://www.prisma.io), [Tiptap](https://tiptap.dev), [dnd-kit](https://dndkit.com), [Tailwind CSS](https://tailwindcss.com), [Fuse.js](https://fusejs.io), [jose](https://github.com/panva/jose), [Resend](https://resend.com), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), and [sanitize-html](https://github.com/apostrophecms/sanitize-html).
- Public data APIs: **ORCID** and **OpenAlex**, which power the publications sync.
- Photography: stock images courtesy of the respective photographers on [Unsplash](https://unsplash.com) (credited in the filenames under `public/`).
