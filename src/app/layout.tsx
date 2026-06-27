import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { NavStudiesProvider } from "@/contexts/NavStudiesContext";
import { getServerLang } from "@/lib/lang";
import { getSiteSettings } from "@/lib/site-settings";
import { DEFAULT_FAVICON } from "@/lib/branding";
import { getNavStudies } from "@/lib/nav-studies";
import { getDictionary } from "@/lib/dictionaries";
import { SITE_NAME, SITE_URL, BRAND_COLORS } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema } from "@/lib/structured-data";

// Inter is the site's body font. next/font self-hosts a WOFF2 latin subset at
// build time with font-display: swap (no FOIT, no ~2.4MB of OTF on every page),
// exposed as the --font-sans token. Geist Mono stays for admin `font-mono`.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata is generated (not static) so the favicon follows the admin-set
// branding (SiteSettings); the read is cached across requests.
export async function generateMetadata(): Promise<Metadata> {
  const { faviconPath } = await getSiteSettings();
  // When an admin uploads a custom favicon, point *every* icon link at it. The
  // built-in /favicon.ico (a real static file in public/) is otherwise still
  // emitted as `shortcut icon` and competes with the upload in the browser's
  // icon picker — the tab keeps showing the old icon even though the upload
  // succeeded and is served. Only with the default favicon do we keep the .ico,
  // where it's a useful fallback for the default SVG icon.
  const hasCustomFavicon = faviconPath !== DEFAULT_FAVICON;
  const icons: Metadata["icons"] = hasCustomFavicon
    ? { icon: faviconPath, shortcut: faviconPath, apple: "/apple-icon.png" }
    : { icon: faviconPath, shortcut: "/favicon.ico", apple: "/apple-icon.png" };
  return {
    // metadataBase lets Next resolve canonical/OG URLs to absolute. It is the
    // build-time NEXT_PUBLIC_SITE_URL (the custom domain in the prod build);
    // local/preview falls back to http://localhost:3000.
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} — University of Auckland Research`,
      template: `%s | ${SITE_NAME}`,
    },
    description: "University of Auckland Research",
    applicationName: SITE_NAME,
    icons,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_NZ",
      alternateLocale: ["zh_CN"],
      title: `${SITE_NAME} — University of Auckland Research`,
      description: "University of Auckland Research",
      // The default share image is provided by src/app/opengraph-image.tsx and
      // merged in automatically; per-page images come from buildPageMetadata.
    },
    twitter: { card: "summary_large_image" },
    // Belt-and-braces with src/app/robots.ts: site-wide noindex until the
    // official launch (flipped by setting ALLOW_INDEXING=1 in the host env).
    ...(process.env.ALLOW_INDEXING === "1"
      ? {}
      : { robots: { index: false, follow: false } }),
  };
}

// themeColor is a `viewport` field in Next 14+/16 (not `metadata`). Drives the
// mobile browser chrome colour and complements the web manifest (src/app/manifest.ts).
export const viewport: Viewport = {
  themeColor: BRAND_COLORS.uoaWaitemata,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getServerLang();
  // Independent server reads — resolve them together. They seed the client
  // providers: navbar logos + studies, and the active-language dictionary (so
  // only one language's strings ship to the client, not both).
  const [navStudies, siteSettings, dict] = await Promise.all([
    getNavStudies(lang),
    getSiteSettings(),
    getDictionary(lang),
  ]);
  return (
    <html
      lang={lang === "ZH" ? "zh-Hans" : "en"}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Skip link — first focusable element; visible only when focused.
            Targets the <main id="main-content"> landmark every page renders. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-[#0c0c48] focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4479]"
        >
          {lang === "ZH" ? "跳到主要内容" : "Skip to content"}
        </a>
        <JsonLd data={organizationSchema()} />
        <LanguageProvider initialLang={lang} dict={dict}>
          <SiteSettingsProvider settings={siteSettings}>
            <NavStudiesProvider studies={navStudies}>
              {children}
            </NavStudiesProvider>
          </SiteSettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
