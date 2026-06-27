# HNU Auckland — Documentation

Documentation for the University of Auckland Human Nutrition Unit website + CMS. New here? Read the [project README](../README.md) for the Quickstart, then [Setup](./setup.md).

## Docs in this set

| Doc | One-liner |
|-----|-----------|
| [architecture.md](./architecture.md) | How the app fits together — App Router layout, the page-block model, and data flow. |
| [setup.md](./setup.md) | Step-by-step local onboarding (the verified, idempotent flow). |
| [database.md](./database.md) | Prisma + SQLite workflow: schema, seeds, and why we use `db push`. |
| [environment.md](./environment.md) | Every environment variable, what reads it, and `.env` vs `.env.local`. |
| [content-editing.md](./content-editing.md) | Which file/block renders which section, and how page content is stored. |
| [styling.md](./styling.md) | Tailwind v4 `@theme` config and UoA brand colours. |
| [icons.md](./icons.md) | Favicon, app-icon, and logo assets (and how to regenerate them). |
| [admin-cms.md](./admin-cms.md) | Using the admin console: pages, studies, team, partners, publications. |
| [troubleshooting.md](./troubleshooting.md) | FAQ for the common onboarding and runtime issues. |
| [deployment.md](./deployment.md) | Building and hosting, including file-SQLite considerations. |
| [contributing.md](./contributing.md) | Conventions, testing, and the PR workflow. |

## How do I…?

| I want to… | Go to |
|------------|-------|
| Get the app running locally | [setup.md](./setup.md) → [README Quickstart](../README.md#quickstart) |
| Understand the project layout | [architecture.md](./architecture.md) |
| Create or reset the database | [database.md](./database.md#create-and-sync-the-schema) |
| Re-seed content | [database.md](./database.md#seeding) |
| Know what an env var does | [environment.md](./environment.md#reference) |
| Turn on 中文 machine translation | [environment.md](./environment.md#machine-translation) |
| Edit a page's text or hero | [content-editing.md](./content-editing.md) |
| Find which file renders a section | [content-editing.md](./content-editing.md) |
| Change a brand colour or theme token | [styling.md](./styling.md) |
| Log in to / use the admin console | [admin-cms.md](./admin-cms.md) |
| Manage studies, team, or partners | [admin-cms.md](./admin-cms.md) |
| Sync publications from ORCID (and auto-sort / delete them) | [admin-cms.md](./admin-cms.md#publications-auto-sorting--deletion) |
| Understand the public-site search box | [architecture.md](./architecture.md#public-site-search) |
| Wire up the contact form email | [environment.md](./environment.md#contact-form-email-resend) |
| Build for production / deploy | [deployment.md](./deployment.md) |
| Run tests or open a PR | [contributing.md](./contributing.md) |
| Fix "study pages 404" / "media empty" / other issues | [troubleshooting.md](./troubleshooting.md) |

## Stuck?

Check **[troubleshooting.md](./troubleshooting.md)** first — it covers the most common onboarding snags (404s after a fresh clone, an empty-looking media library, the `migrate dev` reset prompt, and 中文 falling back to English).
