// Persistence layer for the single, admin-editable publication-filter
// configuration. Bridges the DB-backed settings row to the pure relevance
// classifier in publication-filter.ts, lazily seeding defaults so the admin UI
// and the publication sync always have a config to read.
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AFFILIATION_PHRASES,
  DEFAULT_EXCLUSION_KEYWORDS,
  DEFAULT_INSTITUTION_RORS,
  DEFAULT_MIN_YEAR,
  DEFAULT_ROUTES,
  DEFAULT_STRONG_KEYWORDS,
  DEFAULT_WEAK_KEYWORDS,
  configFromRow,
  type PublicationFilterConfig,
} from "@/lib/publication-filter";

// The singleton is expected to live at id = 1 (seeded). We never rely on that
// though — we read the first row and create one from defaults if none exists.
const SINGLETON_DEFAULTS = {
  minYear: DEFAULT_MIN_YEAR,
  affiliationPhrases: DEFAULT_AFFILIATION_PHRASES.join("\n"),
  institutionRors: DEFAULT_INSTITUTION_RORS.join("\n"),
  strongKeywords: DEFAULT_STRONG_KEYWORDS.join("\n"),
  weakKeywords: DEFAULT_WEAK_KEYWORDS.join("\n"),
  exclusionKeywords: DEFAULT_EXCLUSION_KEYWORDS.join("\n"),
  routeUnitAffiliation: DEFAULT_ROUTES.unitAffiliation,
  routeInstitutionKeyword: DEFAULT_ROUTES.institutionKeyword,
  routeStrongKeywords: DEFAULT_ROUTES.strongKeywords,
  routeWeakMatch: DEFAULT_ROUTES.weakMatch,
  routeExclusion: DEFAULT_ROUTES.exclusion,
  routeNoSignal: DEFAULT_ROUTES.noSignal,
};

export type PublicationFilterSettingRow = {
  id: number;
  minYear: number;
  affiliationPhrases: string;
  institutionRors: string;
  strongKeywords: string;
  weakKeywords: string;
  exclusionKeywords: string;
  routeUnitAffiliation: string;
  routeInstitutionKeyword: string;
  routeStrongKeywords: string;
  routeWeakMatch: string;
  routeExclusion: string;
  routeNoSignal: string;
  updatedAt: Date;
};

// Read the singleton, creating it from defaults on first access so the admin UI
// and sync always have a row to work with.
export async function getOrCreateFilterSetting(): Promise<PublicationFilterSettingRow> {
  const existing = await prisma.publicationFilterSetting.findFirst({
    orderBy: { id: "asc" },
  });
  if (existing) return existing;

  return prisma.publicationFilterSetting.create({
    data: SINGLETON_DEFAULTS,
  });
}

// Load the parsed, defaults-backfilled config the relevance classifier needs.
export async function loadFilterConfig(): Promise<PublicationFilterConfig> {
  const row = await getOrCreateFilterSetting();
  return configFromRow(row);
}
