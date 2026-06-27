// Pure, dependency-free relevance engine for ORCID/OpenAlex-synced publications:
// decides whether a work belongs on the HNU research page and routes it to
// Approved / Pending / Rejected. Kept free of Prisma/IO so the sync pipeline,
// the seed (prisma/seed.ts), the admin settings API and the tests all share one
// classification source of truth; the DB-backed config is layered on top via
// configFromRow.

// Stable, structured decision code so callers can branch on the reason without
// string-matching the human-readable `reason` text (which is free to change).
export type RelevanceReasonCode =
  | "BEFORE_MIN_YEAR"
  | "EXCLUDED"
  | "UNIT_AFFILIATION"
  | "INSTITUTION_AND_KEYWORD"
  | "STRONG_KEYWORDS"
  | "INSTITUTION_ONLY"
  | "SINGLE_STRONG_KEYWORD"
  | "WEAK_KEYWORDS"
  | "NO_SIGNAL";

export type PublicationRelevanceResult = {
  status: "Approved" | "Pending" | "Rejected";
  matchedKeywords: string[];
  // Affiliation snippet(s) (e.g. ROR id or unit phrasing) that matched.
  matchedAffiliation: string[];
  // Structured decision code (stable; safe for callers to switch on).
  reasonCode: RelevanceReasonCode;
  // Human-readable explanation of the decision, surfaced in the admin UI.
  reason: string;
};

// Default relevance config. These seed the singleton `PublicationFilterSetting`
// row (see prisma/seed.ts); at sync time the DB row is authoritative and admins
// can edit it via /admin/publications. The constants are kept exported so the
// seed and tests share one source of truth.
export const DEFAULT_MIN_YEAR = 1998;

// University of Auckland ROR. Present in OpenAlex `institutions[].ror`.
export const DEFAULT_INSTITUTION_RORS = ["03b94tp07"];

// Phrasings that, when found in a paper's raw affiliation string, are a STRONG
// signal the work belongs to the unit. Matched as a normalised substring.
export const DEFAULT_AFFILIATION_PHRASES = [
  "Human Nutrition Unit",
  "HNU",
  "Health Nutrition Unit",
  "Nutrition",
];

export const DEFAULT_STRONG_KEYWORDS = [
  "nutrition",
  "nutritional",
  "diet",
  "dietary",
  "metabolism",
  "metabolic",
  "glycaemic",
  "glycemic",
  "prediabetes",
  "pre-diabetes",
  "diabetes",
  "obesity",
  "appetite",
  "satiety",
  "body composition",
  "energy expenditure",
  "cardiometabolic",
  "pancreatic fat",
  "intra-pancreatic fat",
  "clinical trial",
  "randomized",
  "randomised",
  "whey protein",
  "microbiota",
  "gut microbiota",
  "food",
  "rice",
  "protein diet",
  "low-energy diet",
  "preview",
  "tofi",
  "tofi_asia",
  "tū ora",
  "tu ora",
  "synergy study",
];

export const DEFAULT_WEAK_KEYWORDS = [
  "health",
  "weight loss",
  "overweight",
  "insulin",
  "glucose",
  "cholesterol",
  "fat",
  "bariatric",
];

export const DEFAULT_EXCLUSION_KEYWORDS = [
  "dog",
  "dogs",
  "canine",
  "veterinary",
  "parkinson",
  "alzheimer",
  "huntington",
  "schizophrenia",
  "stroke",
  "amyotrophic lateral sclerosis",
  "frontotemporal dementia",
];

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/&ldquo;|&rdquo;|&mdash;|&ndash;|&beta;|ß/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePublicationTitle(title: string) {
  return normalizeText(title);
}

export function buildPublicationDedupKey(input: {
  title: string;
  year: number | null;
}) {
  return `${normalizePublicationTitle(input.title)}::${input.year ?? "unknown"}`;
}

// Parse an admin-editable list stored as newline- (or comma-) separated text.
// Tolerant of blank lines and surrounding whitespace.
export function parseLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// A ROR id can be stored bare ("03b94tp07") or as a URL
// ("https://ror.org/03b94tp07"); normalise to the bare lowercase id for compare.
function normalizeRor(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/ror\.org\//, "")
    .replace(/\/$/, "");
}

// Where an automatic relevance match sends a synced work. These are the only
// three buckets a publication can live in.
export type RouteTarget = "Approved" | "Pending" | "Rejected";

const ROUTE_TARGETS: readonly RouteTarget[] = ["Approved", "Pending", "Rejected"];

// The admin-configurable routing rules. Each names the kind of match and chooses
// which bucket it lands in. (Only the hard year cutoff is non-routable — it is
// always Rejected.)
export type PublicationRoutes = {
  // The paper's affiliation literally names the unit (e.g. "Human Nutrition Unit").
  unitAffiliation: RouteTarget;
  // An accepted institution (ROR) AND at least one strong keyword.
  institutionKeyword: RouteTarget;
  // Two or more strong keywords, with no affiliation match.
  strongKeywords: RouteTarget;
  // A faint signal only: institution-only, a single strong keyword, or weak keywords.
  weakMatch: RouteTarget;
  // An off-topic / exclusion term, with no unit phrasing or strong keyword. The
  // settings API + admin UI only allow Pending/Rejected here (auto-approving an
  // off-topic paper is nonsensical); the type stays RouteTarget so a hand-edited
  // DB value still classifies safely.
  exclusion: RouteTarget;
  // No signal at all: no unit affiliation, no accepted institution, no keyword,
  // no exclusion term. Defaults to Pending (surface for review) rather than an
  // automatic Rejected.
  noSignal: RouteTarget;
};

// Default routing = the affiliation-only auto-approval policy: only a unit-name
// match auto-approves; every other positive signal waits in Pending for a human;
// off-topic terms are rejected.
export const DEFAULT_ROUTES: PublicationRoutes = {
  unitAffiliation: "Approved",
  institutionKeyword: "Pending",
  strongKeywords: "Pending",
  weakMatch: "Pending",
  exclusion: "Rejected",
  noSignal: "Pending",
};

// Coerce a stored/posted route value to a valid RouteTarget, falling back when
// it's missing or not one of the three buckets.
export function parseRoute(
  value: unknown,
  fallback: RouteTarget,
): RouteTarget {
  return typeof value === "string" && ROUTE_TARGETS.includes(value as RouteTarget)
    ? (value as RouteTarget)
    : fallback;
}

export type PublicationFilterConfig = {
  minYear: number;
  affiliationPhrases: string[];
  institutionRors: string[];
  strongKeywords: string[];
  weakKeywords: string[];
  exclusionKeywords: string[];
  routes: PublicationRoutes;
};

// The config used when no DB row exists yet (first run, before seeding).
export const DEFAULT_FILTER_CONFIG: PublicationFilterConfig = {
  minYear: DEFAULT_MIN_YEAR,
  affiliationPhrases: DEFAULT_AFFILIATION_PHRASES,
  institutionRors: DEFAULT_INSTITUTION_RORS,
  strongKeywords: DEFAULT_STRONG_KEYWORDS,
  weakKeywords: DEFAULT_WEAK_KEYWORDS,
  exclusionKeywords: DEFAULT_EXCLUSION_KEYWORDS,
  routes: DEFAULT_ROUTES,
};

// Build a config from a persisted singleton row (text fields → arrays). An
// admin-cleared list is honoured as "none" — we do NOT fall back to the built-in
// defaults for an empty field. (The defaults only seed a brand-new install and
// back DEFAULT_FILTER_CONFIG, used when no settings row exists at all.)
export function configFromRow(row: {
  minYear: number;
  affiliationPhrases: string;
  institutionRors: string;
  strongKeywords: string;
  weakKeywords: string;
  exclusionKeywords: string;
  // Route columns are optional so older rows / partial fixtures still parse;
  // anything missing or invalid falls back to DEFAULT_ROUTES.
  routeUnitAffiliation?: string | null;
  routeInstitutionKeyword?: string | null;
  routeStrongKeywords?: string | null;
  routeWeakMatch?: string | null;
  routeExclusion?: string | null;
  routeNoSignal?: string | null;
}): PublicationFilterConfig {
  return {
    minYear:
      Number.isInteger(row.minYear) && row.minYear > 0
        ? row.minYear
        : DEFAULT_MIN_YEAR,
    affiliationPhrases: parseLines(row.affiliationPhrases),
    institutionRors: parseLines(row.institutionRors),
    strongKeywords: parseLines(row.strongKeywords),
    weakKeywords: parseLines(row.weakKeywords),
    exclusionKeywords: parseLines(row.exclusionKeywords),
    routes: {
      unitAffiliation: parseRoute(
        row.routeUnitAffiliation,
        DEFAULT_ROUTES.unitAffiliation,
      ),
      institutionKeyword: parseRoute(
        row.routeInstitutionKeyword,
        DEFAULT_ROUTES.institutionKeyword,
      ),
      strongKeywords: parseRoute(
        row.routeStrongKeywords,
        DEFAULT_ROUTES.strongKeywords,
      ),
      weakMatch: parseRoute(row.routeWeakMatch, DEFAULT_ROUTES.weakMatch),
      exclusion: parseRoute(row.routeExclusion, DEFAULT_ROUTES.exclusion),
      noSignal: parseRoute(row.routeNoSignal, DEFAULT_ROUTES.noSignal),
    },
  };
}

export type PublicationRelevanceInput = {
  title: string;
  journal: string | null;
  abstract: string | null;
  pubType: string;
  year?: number | null;
  // Raw affiliation strings for this work (from OpenAlex). May be empty when
  // OpenAlex has no coverage — in which case we fall back to keyword-only.
  affiliationStrings?: string[];
  // ROR ids of the institutions on this work (from OpenAlex).
  rors?: string[];
};

/**
 * Decide whether an ORCID work belongs on the HNU research page.
 *
 * Signals, in priority order:
 *  1. Year < minYear            → Rejected outright.
 *  2. Unit-phrasing in the paper's affiliation (e.g. "Human Nutrition Unit")
 *                               → STRONG: the unit is literally named.
 *  3. Accepted institution ROR but NO unit phrasing
 *                               → WEAK: e.g. a UoA author from another school.
 *  4. Strong/weak title-journal-abstract keywords (secondary signal).
 *
 * Each kind of match's destination is admin-configurable via `config.routes`
 * (see PublicationRoutes). The DEFAULTS encode the affiliation-only policy:
 *  - unit phrasing                                   → routes.unitAffiliation (default Approved)
 *  - institution + strong keyword                    → routes.institutionKeyword (default Pending)
 *  - >=2 strong keywords (no affiliation)            → routes.strongKeywords (default Pending)
 *  - faint signal (institution-only, single strong
 *    keyword, >=2 weak keywords, weak+no-affiliation)→ routes.weakMatch (default Pending)
 *  - exclusion-only with no strong signal            → routes.exclusion (default Rejected)
 *  - no signal at all                                → routes.noSignal (default Pending)
 * Only the hard year cutoff is non-routable — it is ALWAYS Rejected.
 */
export function classifyPublicationRelevance(
  input: PublicationRelevanceInput,
  config: PublicationFilterConfig = DEFAULT_FILTER_CONFIG,
): PublicationRelevanceResult {
  // 1. Hard year cutoff.
  if (
    typeof input.year === "number" &&
    Number.isFinite(input.year) &&
    input.year < config.minYear
  ) {
    return {
      status: "Rejected",
      matchedKeywords: [],
      matchedAffiliation: [],
      reasonCode: "BEFORE_MIN_YEAR",
      reason: `before ${config.minYear}`,
    };
  }

  // 2/3. Affiliation signals.
  const normalizedAffiliations = (input.affiliationStrings ?? []).map((s) => ({
    raw: s,
    normalized: normalizeText(s),
  }));

  const matchedUnitPhrases: string[] = [];
  for (const phrase of config.affiliationPhrases) {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) continue;
    const hit = normalizedAffiliations.find((aff) =>
      aff.normalized.includes(normalizedPhrase),
    );
    if (hit) matchedUnitPhrases.push(phrase);
  }
  const hasUnitPhrasing = matchedUnitPhrases.length > 0;

  const acceptedRors = new Set(config.institutionRors.map(normalizeRor));
  const matchedInstitutionRors = (input.rors ?? [])
    .map(normalizeRor)
    .filter((ror) => ror && acceptedRors.has(ror));
  const hasInstitutionMatch = matchedInstitutionRors.length > 0;

  // 4. Keyword signals (title / journal / abstract / type).
  const searchableText = normalizeText(
    [input.title, input.journal ?? "", input.abstract ?? "", input.pubType].join(
      " ",
    ),
  );

  const matchedStrong = config.strongKeywords.filter((keyword) =>
    searchableText.includes(normalizeText(keyword)),
  );
  const matchedWeak = config.weakKeywords.filter((keyword) =>
    searchableText.includes(normalizeText(keyword)),
  );
  const matchedExcluded = config.exclusionKeywords.filter((keyword) =>
    searchableText.includes(normalizeText(keyword)),
  );

  const matchedKeywords = [...matchedStrong, ...matchedWeak];
  const matchedAffiliation = [...matchedUnitPhrases, ...matchedInstitutionRors];

  const hasStrongKeyword = matchedStrong.length >= 1;
  const hasAnyKeywordSignal = matchedKeywords.length > 0;

  // Off-topic with no strong counter-signal → reject (the seabird-researcher case
  // also lands here unless a strong keyword appears).
  if (matchedExcluded.length > 0 && !hasStrongKeyword && !hasUnitPhrasing) {
    return {
      status: config.routes.exclusion,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "EXCLUDED",
      reason: `excluded term${matchedExcluded.length > 1 ? "s" : ""}: ${matchedExcluded.join(", ")}`,
    };
  }

  // --- Approve ---
  if (hasUnitPhrasing) {
    return {
      status: config.routes.unitAffiliation,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "UNIT_AFFILIATION",
      reason: `unit affiliation: ${matchedUnitPhrases.join(", ")}`,
    };
  }
  if (hasInstitutionMatch && hasStrongKeyword) {
    return {
      status: config.routes.institutionKeyword,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "INSTITUTION_AND_KEYWORD",
      reason: `institution affiliation + keyword: ${matchedStrong.join(", ")}`,
    };
  }
  if (matchedStrong.length >= 2) {
    return {
      status: config.routes.strongKeywords,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "STRONG_KEYWORDS",
      reason: `strong keywords: ${matchedStrong.join(", ")}`,
    };
  }

  // --- Pending (ambiguous → human decides) ---
  if (hasInstitutionMatch) {
    // Accepted institution but no unit phrasing and no strong keyword: this is the
    // "UoA but maybe not nutrition" case — surface for review, never auto-approve.
    return {
      status: config.routes.weakMatch,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "INSTITUTION_ONLY",
      reason: `institution affiliation only (no unit phrasing)`,
    };
  }
  if (hasStrongKeyword) {
    return {
      status: config.routes.weakMatch,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "SINGLE_STRONG_KEYWORD",
      reason: `single strong keyword: ${matchedStrong.join(", ")}`,
    };
  }
  if (matchedWeak.length >= 2) {
    return {
      status: config.routes.weakMatch,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "WEAK_KEYWORDS",
      reason: `weak keywords: ${matchedWeak.join(", ")}`,
    };
  }
  if (hasAnyKeywordSignal && normalizedAffiliations.length === 0) {
    // A single weak keyword and we have NO affiliation data to corroborate:
    // err toward review rather than silently dropping.
    return {
      status: config.routes.weakMatch,
      matchedKeywords,
      matchedAffiliation,
      reasonCode: "WEAK_KEYWORDS",
      reason: `weak keyword: ${matchedWeak.join(", ")}`,
    };
  }

  // --- No signal (ambiguous → routes.noSignal, default Pending for review) ---
  return {
    status: config.routes.noSignal,
    matchedKeywords,
    matchedAffiliation,
    reasonCode: "NO_SIGNAL",
    reason: normalizedAffiliations.length
      ? "not HNU-affiliated and no relevant keywords"
      : "no relevant keywords",
  };
}
