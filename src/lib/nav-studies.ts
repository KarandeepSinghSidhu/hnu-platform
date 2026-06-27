import { prisma } from "@/lib/prisma";
import { localizeStrings } from "@/lib/translate/blocks";
import { PUBLIC_STUDY_WHERE } from "@/lib/data/study-filters";

// Studies for the navbar dropdown. Resolved on the server and seeded into the
// NavStudiesProvider by the root layout (same pattern as SiteSettingsProvider),
// so the dropdown is present on first paint (SSR, no client fetch) and
// re-localises on a language toggle — which calls router.refresh() and re-runs
// this server read against the updated `lang` cookie.

export type NavStudy = {
  slug: string;
  title: string;
  imagePath: string | null;
};

/**
 * Every active, not-yet-completed study in admin-set order, titles localised
 * for ZH (read-only TranslationCache lookup — a miss falls back to the English
 * source, never a live API call). The "hide Completed" filter is shared via
 * PUBLIC_STUDY_WHERE so every public listing stays in sync. Returns [] on error
 * so a transient DB failure leaves the dropdown empty rather than breaking the
 * whole page.
 */
export async function getNavStudies(lang: "EN" | "ZH"): Promise<NavStudy[]> {
  try {
    const studies = await prisma.study.findMany({
      where: PUBLIC_STUDY_WHERE,
      orderBy: { order: "asc" },
      select: { slug: true, title: true, imagePath: true },
    });

    if (lang !== "ZH") return studies;

    const titles = await localizeStrings(
      studies.map((s) => s.title),
      "ZH",
    );
    return studies.map((s, i) => ({ ...s, title: titles[i] }));
  } catch (error) {
    console.error("getNavStudies failed:", error);
    return [];
  }
}
