// Shared helper that assembles Next.js per-page Metadata (title, description,
// canonical, Open Graph / Twitter cards) from localized strings, resolving the
// visitor's language server-side. Centralised here so every route brands and
// localises its <head> consistently rather than hand-rolling Metadata objects.
import type { Metadata } from "next";
import { getServerLang } from "@/lib/lang";
import { SITE_NAME } from "@/lib/constants";

type LocalizedString = { en: string; zh: string };

/**
 * Builds per-page metadata from localized title/description strings, in the
 * visitor's current language (the `lang` cookie, via getServerLang). Beyond the
 * language-selected title/description it also emits:
 *
 * - a self-referential `alternates.canonical` (resolved against `metadataBase`
 *   in the root layout, so it becomes an absolute custom-domain URL at launch);
 * - per-page Open Graph / Twitter card fields (the default OG image from
 *   `src/app/opengraph-image.tsx` is merged in automatically when `image` is
 *   omitted);
 * - an `x-default` hreflang only.
 *
 * On hreflang: the site uses cookie-based i18n — one URL serves both EN and 中文
 * (the language is chosen client-side, after load). A reciprocal
 * `hreflang="en"` / `hreflang="zh-Hans"` pair pointing at the *same* URL would
 * not be honoured by search engines and would misrepresent the site, so we emit
 * only `x-default` → self (the launch-minimum from the launch-readiness audit
 * §7). Indexing both languages needs per-locale URLs (`/en`, `/zh-Hans`), which
 * is a deliberate post-launch refactor.
 */
export async function buildPageMetadata(opts: {
  /** Path relative to the site root, e.g. "/studies" or "/" — resolved against metadataBase. */
  path: string;
  /** Localized pair, or an already-resolved string (e.g. a machine-translated study title). */
  title: LocalizedString | string;
  description: LocalizedString | string;
  /** Optional per-page share image; falls back to the site default OG image. */
  image?: string;
}): Promise<Metadata> {
  const isZh = (await getServerLang()) === "ZH";
  const pick = (v: LocalizedString | string) =>
    typeof v === "string" ? v : isZh ? v.zh : v.en;
  const title = pick(opts.title);
  const description = pick(opts.description);
  // The document <title> brand is applied by the root layout's title.template
  // ("%s | HNU Auckland"); that template does not reach openGraph.title, so add
  // the brand here for share cards.
  const shareTitle = `${title} | ${SITE_NAME}`;

  return {
    // The root page ("/") shares the root layout's route segment, so that
    // layout's title.template ("%s | HNU Auckland") does NOT apply to it —
    // brand it explicitly via `absolute`. Every child page gets the template
    // applied to its bare title.
    title: opts.path === "/" ? { absolute: shareTitle } : title,
    description,
    alternates: {
      canonical: opts.path,
      languages: { "x-default": opts.path },
    },
    openGraph: {
      title: shareTitle,
      description,
      url: opts.path,
      siteName: SITE_NAME,
      locale: isZh ? "zh_CN" : "en_NZ",
      type: "website",
      ...(opts.image ? { images: [{ url: opts.image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      ...(opts.image ? { images: [opts.image] } : {}),
    },
  };
}
