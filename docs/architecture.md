# Architecture

How the HNU Auckland site fits together: the rendering model, the page-block content system, and where everything lives. New here? Read the [project README](../README.md) and [setup.md](./setup.md) first, then come back.

## The big picture

The app is one Next.js 16 App Router project that serves two things from the same codebase:

- A **public marketing site** (`/`, `/research`, `/team`, `/studies`, `/contact`, …) whose content is composed from a database of editable **blocks**.
- An **admin console** (`/admin/*`) where staff edit those blocks, manage studies/team/publications, upload media, and read contact submissions.

Data lives in a **SQLite** file (`prisma/dev.db`) accessed through **Prisma 7** with the `better-sqlite3` adapter. See [database.md](./database.md).

## Rendering model

**Server Components by default.** Pages and most components render on the server (close to the database, no JS shipped). A component opts into the client only when it needs React state, effects, or browser/event handlers — by starting its file with `"use client"`. (Reference: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.)

Client components in this repo include the `Navbar`, every `/admin` page, and a handful of interactive sections (`StudiesOverview`, `PublicationIndex`, `ContactEmailForm`, the study EN / 中文 toggle in `StudyContent`, and the page-editor under `src/components/admin/page-editor/`).

**`params` is a Promise.** In Next 16, dynamic route segments deliver `params` as a Promise you must `await`. Verified in `src/app/studies/[slug]/page.tsx`:

```tsx
type Props = { params: Promise<{ slug: string }> };

export default async function StudyPage({ params }: Props) {
  const { slug } = await params;
  // ...
}
```

The same applies to dynamic **route handlers** (e.g. `src/app/api/admin/pages/[slug]/route.ts` types `params` as `Promise<{ slug: string }>`).

**`force-dynamic` where a render reads the DB.** Pages whose server tree reads live data carry `export const dynamic = "force-dynamic"` so they render per-request instead of being statically cached (e.g. `src/app/page.tsx`, `src/app/studies/[slug]/page.tsx`, `src/app/team/page.tsx`). Server components read the database directly through the data layer (`src/lib/data/*`) rather than self-fetching the internal API.

## How a page renders (the block pipeline)

Most public pages are thin: they render the shared chrome and delegate the body to a single helper.

```tsx
// src/app/page.tsx (the homepage)
export default async function HomePage() {
  return (
    <>
      <Navbar />
      {await renderPageBlocks("home")}
      <Footer />
    </>
  );
}
```

The flow, end to end:

1. **`src/app/<route>/page.tsx`** (server component) calls `renderPageBlocks(slug)`.
2. **`renderPageBlocks(slug)`** in `src/components/blocks/render-page.tsx`:
   - Loads the `Page` for `slug` with its **visible** `PageBlock` rows (ordered by `position`).
   - Renders the **published snapshot** (`Page.publishedContent`) by default — that's what the public site shows. A page that has never been published falls back to its live (draft) blocks. The admin preview route passes `{ draft: true }` to render the live blocks instead.
   - Resolves `media:{id}` image references to real file paths via `resolveBlockContents()` (`src/lib/media-resolve.ts`).
   - If the visitor chose 中文, swaps in cached machine translations via `localizeBlockContents()` (`src/lib/translate/blocks.ts`) — read-only, so a cache miss falls back to English. Study-detail pages keep their manual, board-approved translations and do **not** go through this path.
   - Wraps everything in the shared `<main id="main-content">` landmark.
3. For each block, **`BlockRenderer`** in `src/components/blocks/BlockRenderer.tsx` — a big `switch` on the block's `type` string — renders the matching component from `src/components/sections/*` (plus a few from `src/components/blocks/*` and `src/components/ui/*`).

The block **registry** (`src/lib/blocks/registry.ts`) is the single source of truth for each type's `label`, `category`, editor `fields`, `defaultContent`, and `scope`. It is pure data (no React), so both the server renderer and the client admin editor import it. Default content for the larger blocks lives in `src/lib/blocks/default-content.ts` and `src/lib/blocks/collaborations-content.ts`.

```
page.tsx  →  renderPageBlocks(slug)  →  BlockRenderer (switch on type)  →  <Section />
                    │                          ▲
                    │ media:{id} → paths        │ metadata (label, fields,
                    │ ZH translations           │ defaultContent) from
                    ▼                           │ src/lib/blocks/registry.ts
              Page.publishedContent
              (or live PageBlock rows)
```

For the editor side of this (draft/publish, revisions, the page-builder UI), see [admin-cms.md](./admin-cms.md). For "which file renders section X" and adding a new block type, see [content-editing.md](./content-editing.md).

### Studies render through a parallel pipeline

A study detail page (`/studies/[slug]`) is special. If an admin has built a **custom study layout** (or a shared template applies), `resolveStudyLayoutBlocks(slug)` (`src/components/blocks/study/resolve-study-layout.ts`) returns its blocks and `StudyLayoutView` renders them. Otherwise the page falls back to the default `StudyContent` markup. Study layouts are stored as `Page` rows under reserved slugs (`studylayout-<slug>` per study, `studylayout-__default__` for the shared template — see `src/components/blocks/study/study-slugs.ts`).

### Publications sync (ORCID + OpenAlex → relevance routing → tombstones)

The admin triggers `POST /api/admin/publications/sync`, which pulls each visible team member's ORCID works (`src/lib/orcid.ts`) plus per-paper affiliation data from OpenAlex (`src/lib/openalex.ts`), then runs `classifyPublicationRelevance()` (`src/lib/publication-filter.ts`) to auto-sort each work into **Approved / Pending / Rejected**. Where each kind of match lands is admin-configurable via the `PublicationFilterSetting` route columns (see [admin-cms.md](./admin-cms.md#publications-auto-sorting--deletion) and [database.md](./database.md#publicationfiltersetting)); the sync never overwrites a `status` a human reviewed. Deletes are durable: deleting a publication writes a **`DeletedPublication`** tombstone, and the sync skips re-creating any work matching one (by source id, DOI, or title+year key), so a removed paper doesn't reappear on the next sync.

### Public-site search

The navbar search box (`src/components/layout/Navbar.tsx`) calls `GET /api/search?q=…` (`src/app/api/search/route.ts`, `force-dynamic`). The handler unions matches across **studies**, **team members**, **approved+visible publications** (newest-first), the static **page list**, and **page-builder block content** — for the last it flattens each page's published snapshot (or visible draft blocks for never-published pages) to prose, strips HTML/paths, and returns a snippet centred on the match. Results are capped and de-duplicated by destination.

## Folder map

```
src/
├── app/                      # App Router: routes, layouts, API
│   ├── layout.tsx            # Root layout (html/body, LanguageProvider, fonts)
│   ├── page.tsx              # Homepage
│   ├── globals.css           # Tailwind v4 entry + theme + brand vars (see styling.md)
│   ├── research/ team/ contact/ collaborations/ studies/   # public routes
│   │   └── studies/[slug]/   # dynamic study page (params is a Promise)
│   ├── admin/                # admin console pages (client components)
│   └── api/                  # route handlers
│       ├── admin/            # gated admin API (auth, pages, studies, media, …)
│       └── …                 # public API (team, publications, contact, search, …)
├── components/
│   ├── sections/             # the page "section" components (most blocks render here)
│   ├── layout/               # Navbar, Footer, PageLayout, SectionContainer, heroes
│   ├── ui/                   # small reusables (Button, cards, callout banners)
│   ├── blocks/               # render-page.tsx, BlockRenderer.tsx, study/* layout pieces
│   ├── admin/                # admin-only UI incl. page-editor/ and media/
│   └── team/                 # team-page sub-components (board, research, alumni, filter)
├── contexts/                 # LanguageContext (client) for the EN/中文 toggle
├── lib/                      # non-UI logic (see below)
├── messages/                 # en.ts / zh.ts — fixed UI string dictionaries
└── middleware.ts             # gates /admin/* and /api/admin/*

prisma/
├── schema.prisma             # 17 models (Study, TeamMember, Publication, Page, PageBlock, …)
├── dev.db                    # the SQLite database (gitignored content)
├── seed.ts, seed-page-blocks.ts, catalog-public-media.ts, warm-translations.ts, …
└── migrations/               # committed migration history (drifted — use db push; see database.md)

public/                       # static assets; runtime uploads land in public/uploads/
```

### `src/lib/` quick reference

| File / dir | Responsibility |
|------------|----------------|
| `prisma.ts` | The shared Prisma client (better-sqlite3 adapter; reused across hot reloads). |
| `admin-session.ts` | Signs/verifies the `admin_session` JWT (jose, HS256). See **Auth** below. |
| `data/*`, `constants.ts` | Direct DB reads for server components (e.g. team, partner logos); site identity + brand colour constants. |
| `blocks/*` | The block system: `registry.ts`, `types.ts`, `default-content.ts`, `collaborations-content.ts`, `validate.ts`, `row.ts`, `page-paths.ts`. |
| `media-resolve.ts`, `media-refs.ts`, `media-upload.ts` | Resolve `media:{id}` refs to paths; find where an asset is used; handle uploads. |
| `translate/*` | Block-aware machine translation with a DB-backed cache (`blocks.ts`, `provider.ts`, `local-fallbacks.ts`). |
| `orcid.ts`, `openalex.ts`, `publication-filter*.ts` | Publications sync + admin-configurable relevance filtering / auto-sort routing (see below). |
| `email.ts` | Resend contact-form email (no-op when unconfigured). |
| `page-publish.ts`, `page-draft-ops.ts` | Draft/publish snapshot helpers for the page builder. |
| `lang.ts`, `localized-metadata.ts` | Server-side language detection + localized page metadata. |
| `order.ts`, `rate-limit.ts`, `safe-url.ts`, `sanitize.ts`, `image-dimensions.ts` | Misc utilities (clamp order ints, rate-limit, URL/HTML safety, image sizing). |

## Auth (admin)

A single shared `ADMIN_PASSWORD` gates the admin area:

1. `POST /api/admin/auth/login` checks the submitted password against `ADMIN_PASSWORD`.
2. On success it issues a **jose** JWT (HS256, signed with `ADMIN_SESSION_SECRET`, 7-day expiry) and sets it as the `httpOnly` **`admin_session`** cookie. See `src/lib/admin-session.ts`.
3. **`src/middleware.ts`** gates every `/admin/*` page and `/api/admin/*` route, verifying the cookie. Unauthenticated API calls get `401`; unauthenticated pages redirect to `/admin/login?next=…`. The login page and `/api/admin/auth/*` are exempt.

This is a prototype-grade single-role model (the JWT payload is just `{ role: "admin" }`). Treat both secrets as production secrets — see [environment.md](./environment.md) and [deployment.md](./deployment.md).

## Related docs

- [content-editing.md](./content-editing.md) — find/edit the code or block behind any section; add a block type.
- [admin-cms.md](./admin-cms.md) — admin internals: routes, the page editor, draft/publish, media usage.
- [styling.md](./styling.md) — Tailwind v4 `@theme`, brand tokens, responsive layout.
- [database.md](./database.md) — Prisma/SQLite, seeds, `db push` vs `migrate dev`.
- [deployment.md](./deployment.md) — hosting a file-SQLite + native-module app.
