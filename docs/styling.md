# Styling

How styling works in this repo: **Tailwind CSS v4**, configured in CSS (no JS config file), plus the UoA brand tokens and the responsive approach.

> **Tailwind v4 is config-in-CSS.** There is **no `tailwind.config.js`** (verified — none exists in the repo). Configuration lives in `src/app/globals.css` via `@import "tailwindcss"` and `@theme`. Reference: `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`.

## Setup at a glance

| Piece | Where |
|-------|-------|
| Tailwind import + theme + brand vars + global rules | `src/app/globals.css` |
| PostCSS plugin | `postcss.config.mjs` → `@tailwindcss/postcss` |
| Packages | `tailwindcss` + `@tailwindcss/postcss` (both v4, devDependencies) |
| Global CSS imported once | `src/app/layout.tsx` (`import "./globals.css"`) |

`globals.css` begins with:

```css
@import "tailwindcss";
```

That single import pulls in Tailwind's base, utilities, and the v4 engine. PostCSS wires it up:

```js
// postcss.config.mjs
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

## Theme and design tokens

Two distinct things live in `globals.css`, and it's worth keeping them straight:

### 1. The `@theme inline` block (Tailwind tokens)

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);
}
```

Variables defined in `@theme` become Tailwind tokens (e.g. `--color-background` → the `bg-background` / `text-background` utilities). Today this block only maps `background`/`foreground` colours and the `font-sans`/`font-mono` families. The font variables point at `--font-inter` and `--font-geist-mono`, both defined in `src/app/layout.tsx` via `next/font/google` (Inter for the body, Geist Mono for `font-mono`).

> **Note:** the body font is **Inter**, loaded via `next/font/google` (`src/app/layout.tsx`), which self-hosts a WOFF2 latin subset with `font-display: swap` and exposes it as the `--font-inter` CSS variable on `<html>`. `body` in `globals.css` sets `font-family: var(--font-inter), sans-serif`, and the `font-sans` Tailwind token also maps to `--font-inter` — so `font-sans` and the default body font now agree (both Inter). Use `var(--font-inter)` when you need the family in raw CSS/inline styles (the `@theme inline` `--font-sans` token is inlined into utilities, not emitted as a `:root` variable). Geist **Mono** remains for the `font-mono` utility (admin tables).

### 2. Brand colours (plain CSS custom properties)

The UoA brand palette is defined as ordinary CSS variables under `:root` (not inside `@theme`):

```css
:root {
  --uoa-waitemata: #0c0c48;  /* navy — primary background for navbars/headers */
  --uoa-navy: #0c0c48;       /* alias of waitematā */
  --uoa-azure: #1f2bd4;      /* secondary, bright blue */
  --uoa-mahina: #00caef;     /* secondary, light blue */
}
```

Because these are **not** in `@theme`, there are no auto-generated `bg-uoa-azure`-style utilities. Use them one of these ways:

- **Arbitrary value with the CSS var:** `className="bg-[var(--uoa-azure)]"`, `text-[var(--uoa-mahina)]`.
- **Hex literal** (common in this codebase): `className="text-[#0c0c48]"`, `bg-[#0c0c48]` — the navy `#0c0c48` appears throughout the admin UI and section components.
- **From TS:** `BRAND_COLORS` in `src/lib/constants.ts` exposes the same hexes (`uoaWaitemata`, `uoaAzure`, `uoaMahina`) for inline styles or computed values.

The brand palette is defined as `:root` CSS variables in `src/app/globals.css` (mirrored by `BRAND_COLORS` in `src/lib/constants.ts`) — those two files are the source of truth. Logo and icon assets are covered in [icons.md](./icons.md).

### Changing or adding a theme token

- **A brand colour value:** edit the `:root` variable in `globals.css` (and keep `src/lib/constants.ts` in sync if you use the TS constants). Every `var(--uoa-*)` usage updates automatically; hardcoded hex literals (`#0c0c48`) do not.
- **A new Tailwind utility token:** add it inside `@theme` (e.g. `--color-brand-navy: #0c0c48;` enables `bg-brand-navy`). Prefer this if you want first-class utilities for the brand colours.

## Other global CSS

`globals.css` also defines small global rules and keyframes used by components:

- `@font-face` for Inter (Regular / Italic / Medium / Bold).
- Keyframes `marquee`, `slideDown`, `slideUp`, and helpers `.marquee-track`, `.dropdown-open`, `.dropdown-closing` (navbar dropdown + the partner marquee).
- `.nav-link` underline-on-hover effect.
- A styled `input[type="search"]` clear button.
- A `prefers-color-scheme: dark` block that flips `--background`/`--foreground` (the public site is otherwise light-themed).

## Responsive layout

Styling is **mobile-first**: base classes target small screens, and `lg:` (and to a lesser extent `md:`/`sm:`) prefixes layer on larger-screen layout. The `lg:` breakpoint does most of the heavy lifting — e.g. `BlockRenderer`'s row layout stacks columns on mobile and goes horizontal at `lg:` (`flex flex-col gap-8 lg:flex-row`), and the page editor becomes a fixed-height split canvas at `lg:`.

Layout for a given section lives in that section's component (`src/components/sections/*`, `src/components/ui/*`, `src/components/layout/*`) — find it via the techniques in [content-editing.md](./content-editing.md).

> **The public-site responsive layout is actively owned and iterated by the public-site developer.** This doc documents *where* layout lives and the conventions in use; it does **not** prescribe specific responsive fixes. Before changing breakpoints or layout on a public page, coordinate with whoever owns that page so you don't collide with in-flight work.

## Storybook

Components are also developed in isolation with **Storybook** (`npm run storybook`, port 6006). Stories live alongside components as `*.stories.tsx` (e.g. `Button.stories.tsx`, `Navbar.stories.tsx`). Storybook loads the same `globals.css`, so brand tokens and Inter apply there too.

## Related docs

- [content-editing.md](./content-editing.md) — finding the component that renders a section.
- [icons.md](./icons.md) — favicon, app-icon, and logo assets.
- [architecture.md](./architecture.md) — where component files live.
