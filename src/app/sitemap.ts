import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/constants";
import { PUBLIC_STUDY_WHERE } from "@/lib/data/study-filters";

// CMS-driven: study slugs come from the DB, which on Render only exists at
// runtime (the persistent disk isn't mounted during builds — a static sitemap
// fails the deploy trying to open /var/data/app.db). Generate per-request,
// matching the force-dynamic convention used across this app's CMS pages.
export const dynamic = "force-dynamic";

// Static public routes. Excludes /admin/*, /api/*, and /collaborations/funding
// (which 301s to /contact and has no content of its own).
const STATIC_PATHS = [
  "",
  "/about",
  "/team",
  "/research",
  "/contact",
  "/collaborations",
  "/collaborations/academic",
  "/collaborations/industry",
] as const;

// Hardcoded study routes that always render, independent of the DB. They are
// ALSO seeded as active Study rows, so they'd otherwise appear twice at the same
// /studies/{slug} URL — the Map below dedupes them.
const PERMANENT_STUDY_SLUGS = ["ferdinand", "food-beverage", "nz-synergy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));

  const studies = await prisma.study.findMany({
    // Same "active and not Completed" policy every other public study listing
    // uses, so the sitemap doesn't advertise studies hidden from the site.
    where: PUBLIC_STUDY_WHERE,
    select: { slug: true, updatedAt: true },
  });

  // Dedupe study slugs by URL; the DB row wins on lastModified when both exist.
  const lastMod = new Map<string, Date>();
  for (const slug of PERMANENT_STUDY_SLUGS) lastMod.set(slug, now);
  for (const s of studies) lastMod.set(s.slug, s.updatedAt);

  const studyEntries: MetadataRoute.Sitemap = [...lastMod].map(
    ([slug, lastModified]) => ({
      url: `${SITE_URL}/studies/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  return [...staticEntries, ...studyEntries];
}
