# Content editing

How to find — and change — the code or content behind any section of the public site. Read [architecture.md](./architecture.md) for the rendering model first; this doc is the practical "I need to edit X" guide.

There are **two ways** content changes:

- **Edit via the admin console** — most page text, images, heroes, and card content are stored as **blocks** in the database and edited at `/admin/pages`. No code, no deploy. See [admin-cms.md](./admin-cms.md).
- **Edit in code** — fixed markup, layout, "content-frozen" blocks, and anything not exposed as an editable field lives in a React component under `src/components/`.

This doc helps you tell which is which, and find the right file fast.

## How do I find the file that renders a given section?

### Option A — React DevTools (fastest)

1. Run the site (`npm run dev`) and open the page.
2. In the browser's **React DevTools**, select the rendered element. The component name (e.g. `TrialDesign`, `InfoCardRight`, `OurPartners`) is the filename.
3. Open `src/components/sections/<Name>.tsx` (or `src/components/ui/<Name>.tsx` / `src/components/layout/<Name>.tsx` / `src/components/blocks/<Name>.tsx`).

### Option B — via the block type

Every block on a page has a `type` string. Map it to a component through the `BlockRenderer` switch:

1. Open the page in the admin editor (`/admin/pages/<slug>`). Each block card shows its **label** (e.g. "Trial design", "Info card (image right)").
2. Find that label in **`src/lib/blocks/registry.ts`** to get its `type` (e.g. `trialDesign`, `infoCardRight`).
3. Open **`src/components/blocks/BlockRenderer.tsx`** and find the `case "<type>":` — it names the component it renders.

### Option C — grep for visible text

If the copy isn't admin-editable, it's usually a literal string or a default in code:

```bash
# search components and block defaults for a phrase you see on the page
grep -rn "Trial Design" src/components src/lib/blocks
```

Default copy for the larger blocks lives in `src/lib/blocks/default-content.ts` and `src/lib/blocks/collaborations-content.ts`.

## The `sections/` naming convention

Public page sections live in **`src/components/sections/`**, one component per file, named in PascalCase after what they render (`HomepageHero`, `DiscoverVideo`, `RecentPublications`, `ContactDetails`, …). A few render through other folders:

- **`src/components/ui/`** — small reusable pieces (`InfoCardLeft`, `InfoCardRight`, `CalloutBannerLeft`, `CalloutBannerRight`, `Button`, `StudyCard`).
- **`src/components/layout/`** — page chrome and shared heroes (`Navbar`, `Footer`, `StudiesHero`, `SubpageHero`).
- **`src/components/blocks/`** — block-system glue and study layout pieces (`SubpageHeroBlock`, `TeamSectionsBlock`, `HomepageStudiesBlock`, `study/*`).

> Not every file in `sections/` is wired into the block system. Some older page-specific components (e.g. `DiscoverFacilities`, `ResearchFocus`) exist in the tree but are only used where directly imported. The authoritative list of **block** types is `registry.ts`; the authoritative list of what each block renders is the `BlockRenderer` switch.

## Editing content via the admin (page blocks)

Most copy and imagery is a block field. Workflow:

1. Go to `/admin/pages` and open the page.
2. Click **Edit** on a block to open its field form (the fields come straight from `registry.ts`). Field types include `text`, `textarea`, `richText` (TipTap), `image` (media picker), `url`, `enum`, `boolean`, `studyCards`, `paragraphArray`, and `updatesList`.
3. Save. Edits are a **draft** — click **Publish** to push them live. (Draft/publish, history, and discard are covered in [admin-cms.md](./admin-cms.md).)

**Images** are stored as `media:{id}` references (chosen from the media library) or raw `/public/...` paths. The renderer resolves both to a real path at render time (`resolveBlockContents()` in `src/lib/media-resolve.ts`), so block components always receive a plain string `src`.

**Content-frozen blocks** (registry `editable: false`, e.g. `studiesOverview`, `studiesContactCard`, `studiesHero`) have no editable fields — they can be reordered, hidden, or deleted in the editor, but their markup is fixed in code. To change their content, edit the component.

## Editing content in code

When the text/markup isn't a block field, edit the component directly. Two cases to know:

- **A block's fixed parts.** Some block components mix editable props with hardcoded markup. Editable values come from the block content (with the registry `defaultContent` as a fallback when a field is blank). Example: `HomepageHero` takes `title`/`buttonLabel`/etc. as props but its logos and layout are fixed in `src/components/sections/HomepageHero.tsx`.
- **Default copy.** A new block instance starts from `defaultContent` in `registry.ts` (large defaults are imported from `default-content.ts` / `collaborations-content.ts`). Changing a default only affects **newly added** blocks and the migration/seed backfill — existing rows keep their stored content.

> **Study-detail content is data, not code.** A study's title, description, eligibility, compensation, contact, and PDFs are `Study` rows edited at `/admin/studies`. Their 中文 versions are **manual, board-approved** fields (never machine-translated). The default study page layout is `StudyContent`; a custom arrangement is a study layout (see [admin-cms.md](./admin-cms.md)).

## How to add a new block type

Three edits, in this order — they mirror the pipeline in [architecture.md](./architecture.md):

1. **Register it** in `src/lib/blocks/registry.ts`. Add a `BlockDefinition` to the `DEFINITIONS` array:
   - `type` — the registry key (also stored in `PageBlock.type`).
   - `label`, `category` (`Hero` | `Heading` | `Layout` | `Study` | `Content` | `Dynamic`).
   - `editable` — `false` for content-frozen markup; `true` to expose fields.
   - `fields` — array of `BlockField` (`key`, `label`, `type`, optional `options`/`help`). Field types are defined in `src/lib/blocks/types.ts`.
   - `defaultContent` — starting content for a new instance.
   - `scope` — defaults to `"page"`; use `"study"` for study-layout-only blocks, `"both"` to appear in both builders.
2. **Render it** in `src/components/blocks/BlockRenderer.tsx`. Add a `case "<type>":` that reads the content (use the `str`/`bool`/`strArray` coercion helpers already in that file — block content is untrusted JSON) and returns your component.
3. **Build the component** under `src/components/sections/` (or `ui`/`blocks` as appropriate) and import it at the top of `BlockRenderer.tsx`.

Optional but recommended:

- If the block has translatable text, confirm the field types you chose are handled by `mapBlockText()` in `src/lib/translate/blocks.ts` (it drives translation off the registry: `text`/`textarea`/`richText`/`paragraphArray`/`studyCards`/`updatesList` are translated; `image`/`url`/`enum`/`boolean` are not).
- Add a unit test (Vitest) for any non-trivial coercion or content shape. See [contributing.md](./contributing.md).

After these three edits the block appears in the admin "Add block" menu (grouped by category — see `src/components/admin/page-editor/AddBlockButton.tsx`), renders on the public site, and participates in draft/publish + translation automatically.

## Related docs

- [architecture.md](./architecture.md) — the full render pipeline and folder map.
- [admin-cms.md](./admin-cms.md) — the page editor, draft/publish, media library, study layouts.
- [styling.md](./styling.md) — Tailwind v4 utilities and brand tokens used in components.
