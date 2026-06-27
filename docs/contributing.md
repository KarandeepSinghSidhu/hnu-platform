# Contributing

Conventions for working on the HNU Auckland site + CMS: branches, commits, pull requests, the pre-PR checks, and keeping the docs honest.

> **This repo runs bleeding-edge Next.js 16 / React 19 / Prisma 7 / Tailwind v4** whose APIs differ from older versions — don't assume older conventions. Read the relevant App Router guides bundled at `node_modules/next/dist/docs/` before writing code.

## Branch & PR workflow

The team works on **feature branches** merged into **`main`** via pull request on GitHub (`uoa-compsci399-s1-2026/capstone-project-s1-2026-team-24`).

1. Branch off the latest `main`:
   ```bash
   git checkout main && git pull
   git checkout -b feat/short-description
   ```
2. Make focused commits (see style below).
3. Push and open a PR into `main`. PRs get a **Copilot** review; address its comments.
4. Merge once review is satisfied and the branch is up to date with `main`.

Keep PRs scoped to one concern where you can — it makes review (human and Copilot) faster and the history easier to bisect.

## Commit message style

Conventional-ish prefixes, matching the existing history:

| Prefix | Use for |
|--------|---------|
| `feat:` | A new feature or capability. |
| `fix:` | A bug fix. |
| `docs:` | Documentation only. |
| `chore:` | Tooling, deps, config, housekeeping. |

Examples from the log: `feat: new mobile navbar`, `fix: margins for ui components`, `feat: navbar hover underline`.

> **Do not add AI attribution to commits.** No `Co-Authored-By: Claude` trailer (or any AI co-author line) in commit messages.

## Before you open a PR

Run the checks locally and fix anything they flag. The fastest path is the bundled **`verify`** script, which chains the type-check, lint, and the API test project:

```bash
npm run verify       # tsc --noEmit && eslint && vitest run --project api
```

Or run them individually:

```bash
npx tsc --noEmit     # type-check (no emit)
npm run test         # unit tests (vitest run)
npm run lint         # eslint
```

- **Type-check** — the project is strict TypeScript; `tsc --noEmit` catches type errors the dev server may not surface immediately.
- **Tests** — Vitest unit tests live next to what they cover, including under `src/app/api/test/` (route/handler tests) and `src/lib/**`. Add or update tests when you change behaviour. End-to-end tests run separately with Playwright: `npm run test:e2e` (snapshots: `npm run test:e2e:update`); the suite includes an admin smoke test (`e2e/admin.spec.ts`).
- **Lint** — ESLint flat config (`eslint.config.mjs`) extends `eslint-config-next` (core-web-vitals + TypeScript) and the Storybook plugin.

> **There is no build/test/lint CI yet.** The only GitHub Actions workflow (`.github/workflows/claude.yml`) is a `@claude` mention bot, not a build pipeline — so these checks are **not** enforced automatically on PRs. Running them locally before pushing is on you. Adding a CI workflow that runs `tsc --noEmit`, `vitest`, and `lint` on PRs is a recommended improvement.

## Database changes

If you touch `prisma/schema.prisma`, regenerate the client and sync your local DB. This repo uses **`prisma db push`**, not `migrate dev` — the committed migration history has drifted from the live schema, so `migrate dev` prints a destructive-reset prompt. Full workflow (and when a real migration *is* appropriate): [database.md](./database.md).

```bash
npx prisma db push      # sync prisma/dev.db to the schema
npx prisma generate     # regenerate the Prisma client
```

If you add/seed content, keep `prisma/seed.ts` / `prisma/seed-page-blocks.ts` working so a fresh clone still onboards via the [setup.md](./setup.md) flow.

## Keeping docs honest

Treat docs as part of the change, not an afterthought:

- When you change behaviour, update the affected doc(s) in `docs/` (and [`../README.md`](../README.md) if the change touches setup, env, or conventions). The docs index is [docs/README.md](./README.md).
- **Verify before you write.** These docs deliberately cite real files/paths. Don't document an API from memory — open the file and confirm. Versions here are ahead of most training data.
- Match the house style: skimmable, task-oriented, H2/H3 headings, relative cross-links (e.g. `./setup.md`), and verified code snippets only.
- Don't reference the gitignored `keep-local-claude-made-for-personal-planning-and-context/` directory.

## Local environment

A fresh clone has **no `.env*`** (gitignored; only `.env.example` ships). Copy it and fill in secrets — see [setup.md](./setup.md) and [environment.md](./environment.md). Never commit a real `.env*` (only `.env.example` is allowed by `.gitignore`).

## Related docs

- [setup.md](./setup.md) — get the app running locally.
- [database.md](./database.md) — Prisma/SQLite workflow and the `db push` rule.
- [architecture.md](./architecture.md) — how the codebase is organised.
- [deployment.md](./deployment.md) — production/hosting considerations.
