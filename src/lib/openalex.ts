// Fetches per-work institutional affiliation data (ROR ids + raw affiliation
// strings) from OpenAlex, keyed so the ORCID sync route can attach an
// affiliation signal to each publication. Best-effort by design: any network or
// parse failure degrades to an empty map rather than failing the sync, letting
// the caller fall back to keyword-only classification.
import {
  buildPublicationDedupKey,
  normalizePublicationTitle,
} from "@/lib/publication-filter";

const OPENALEX_API_BASE_URL =
  process.env.OPENALEX_API_BASE_URL?.replace(/\/$/, "") ??
  "https://api.openalex.org";

// OpenAlex grants faster, more reliable access (the "polite pool") to requests
// that identify themselves with a mailto. Set OPENALEX_MAILTO to opt in.
const OPENALEX_MAILTO = process.env.OPENALEX_MAILTO?.trim() || null;

export type WorkAffiliation = {
  // Bare lowercased ROR ids of the institutions on this work.
  rors: string[];
  // Raw affiliation strings (free text) for this work, across its authorships.
  rawAffiliationStrings: string[];
};

// Map keyed by normalized DOI (preferred) and normalized title::year (fallback),
// so the sync route can look up affiliations by whichever key a work exposes.
export type OrcidAffiliationMap = Map<string, WorkAffiliation>;

type OpenAlexInstitution = {
  ror?: string | null;
  display_name?: string | null;
};

type OpenAlexAuthor = {
  orcid?: string | null;
};

type OpenAlexAuthorship = {
  author?: OpenAlexAuthor | null;
  institutions?: OpenAlexInstitution[] | null;
  raw_affiliation_strings?: string[] | null;
};

type OpenAlexWork = {
  doi?: string | null;
  title?: string | null;
  publication_year?: number | null;
  authorships?: OpenAlexAuthorship[] | null;
};

type OpenAlexWorksResponse = {
  results?: OpenAlexWork[];
  meta?: {
    next_cursor?: string | null;
  };
};

// OpenAlex returns DOIs as full URLs ("https://doi.org/10.x/y"); the rest of the
// app keys on the bare lowercase DOI. Normalise to match.
function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  const trimmed = doi.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
}

function normalizeOrcid(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value
    .trim()
    .toUpperCase()
    .match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/);
  return match ? match[1] : null;
}

function normalizeRorId(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/ror\.org\//, "")
    .replace(/\/$/, "");
  return cleaned || null;
}

// Reduce a work's authorships to the affiliation we care about. If one of the
// authorships is the member themselves (ORCID match) we prefer ONLY that
// authorship's affiliation — that's where the unit would be named. Otherwise we
// union every authorship (best-effort).
function extractAffiliation(
  work: OpenAlexWork,
  memberOrcid: string | null,
): WorkAffiliation {
  const authorships = work.authorships ?? [];

  let relevant: OpenAlexAuthorship[] = [];
  if (memberOrcid) {
    relevant = authorships.filter(
      (a) => normalizeOrcid(a.author?.orcid) === memberOrcid,
    );
  }
  if (relevant.length === 0) {
    relevant = authorships;
  }

  const rors = new Set<string>();
  const rawStrings = new Set<string>();

  for (const authorship of relevant) {
    for (const institution of authorship.institutions ?? []) {
      const ror = normalizeRorId(institution.ror);
      if (ror) rors.add(ror);
    }
    for (const raw of authorship.raw_affiliation_strings ?? []) {
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      if (trimmed) rawStrings.add(trimmed);
    }
  }

  return {
    rors: [...rors],
    rawAffiliationStrings: [...rawStrings],
  };
}

function buildWorksUrl(orcidId: string, cursor: string): string {
  const url = new URL(`${OPENALEX_API_BASE_URL}/works`);
  url.searchParams.set("filter", `author.orcid:${orcidId}`);
  url.searchParams.set("per-page", "200");
  url.searchParams.set(
    "select",
    "doi,title,publication_year,authorships",
  );
  url.searchParams.set("cursor", cursor);
  if (OPENALEX_MAILTO) {
    url.searchParams.set("mailto", OPENALEX_MAILTO);
  }
  return url.toString();
}

/**
 * Fetch per-work affiliation data (institution RORs + raw affiliation strings)
 * for every work attributed to an ORCID iD on OpenAlex.
 *
 * Best-effort: any network/parse failure resolves to an empty map so the caller
 * falls back to keyword-only classification rather than failing the whole sync.
 *
 * Cost: typically 1-2 requests per researcher (cursor pagination, 200/page).
 */
export async function fetchOrcidAffiliations(
  orcidId: string,
): Promise<OrcidAffiliationMap> {
  const map: OrcidAffiliationMap = new Map();
  const memberOrcid = normalizeOrcid(orcidId);
  if (!memberOrcid) return map;

  let cursor = "*";
  // Hard cap on pages so a pathological response can't loop forever.
  const MAX_PAGES = 20;

  try {
    for (let page = 0; page < MAX_PAGES && cursor; page += 1) {
      const response = await fetch(buildWorksUrl(memberOrcid, cursor), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        console.error(
          `OpenAlex request failed for ${orcidId}: ${response.status} ${response.statusText}`,
        );
        break;
      }

      const data = (await response.json()) as OpenAlexWorksResponse;
      const results = data.results ?? [];

      for (const work of results) {
        const affiliation = extractAffiliation(work, memberOrcid);
        // Skip works that yield no useful affiliation signal at all.
        if (
          affiliation.rors.length === 0 &&
          affiliation.rawAffiliationStrings.length === 0
        ) {
          continue;
        }

        const doiKey = normalizeDoi(work.doi);
        if (doiKey) map.set(doiKey, affiliation);

        if (work.title) {
          const titleKey = buildPublicationDedupKey({
            title: work.title,
            year:
              typeof work.publication_year === "number"
                ? work.publication_year
                : null,
          });
          // Don't clobber a DOI-keyed entry's richer data, but provide the
          // title fallback for works whose DOI we couldn't read.
          if (!map.has(titleKey)) map.set(titleKey, affiliation);
        }
      }

      const next = data.meta?.next_cursor ?? null;
      if (!next || results.length === 0) break;
      cursor = next;
    }
  } catch (error) {
    console.error(`Failed to fetch OpenAlex affiliations for ${orcidId}:`, error);
    return map;
  }

  return map;
}

// Look up a work's affiliation by DOI (preferred) then title+year, returning an
// empty (but well-formed) value when OpenAlex had no coverage for it.
export function lookupAffiliation(
  map: OrcidAffiliationMap,
  input: { doi: string | null; title: string; year: number | null },
): WorkAffiliation {
  const doiKey = normalizeDoi(input.doi);
  if (doiKey && map.has(doiKey)) {
    return map.get(doiKey) as WorkAffiliation;
  }
  const titleKey = buildPublicationDedupKey({
    title: input.title,
    year: input.year,
  });
  if (map.has(titleKey)) {
    return map.get(titleKey) as WorkAffiliation;
  }
  // Also try a title-only normalised match in case the year differs by edition.
  const normalizedTitle = normalizePublicationTitle(input.title);
  for (const [key, value] of map) {
    if (key.startsWith(`${normalizedTitle}::`)) return value;
  }
  return { rors: [], rawAffiliationStrings: [] };
}
