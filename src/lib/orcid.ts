// ORCID public-API client: validates ORCID iDs, fetches a member's works
// (summary + per-work detail), and normalises them into the shape the
// publication sync consumes. Talks to the unauthenticated public API, so all
// fields are optional/best-effort and parsing is defensive throughout.

// Default to the PRODUCTION public ORCID API (no auth required for public
// records). Override with ORCID_API_BASE_URL (e.g. the sandbox) for testing.
const ORCID_API_BASE_URL =
  process.env.ORCID_API_BASE_URL?.replace(/\/$/, "") ??
  "https://pub.orcid.org/v3.0";

type OrcidWorksResponse = {
  group?: Array<{
    "work-summary"?: OrcidWorkSummary[];
  }>;
};

type OrcidWorkSummary = {
  "put-code"?: number;
  title?: {
    title?: {
      value?: string;
    };
  };
  type?: string;
  "journal-title"?: {
    value?: string;
  } | null;
  "publication-date"?: {
    year?: {
      value?: string;
    } | null;
  } | null;
  url?: {
    value?: string;
  } | null;
  path?: string;
  visibility?: string;
};

type OrcidExternalId = {
  "external-id-type"?: string;
  "external-id-value"?: string;
  "external-id-url"?: {
    value?: string;
  } | null;
};

type OrcidWorkDetailResponse = {
  "put-code"?: number;
  title?: {
    title?: {
      value?: string;
    };
  };
  type?: string;
  "journal-title"?: {
    value?: string;
  } | null;
  "publication-date"?: {
    year?: {
      value?: string;
    } | null;
  } | null;
  url?: {
    value?: string;
  } | null;
  "short-description"?: string | null;
  "external-ids"?: {
    "external-id"?: OrcidExternalId[];
  };
};

export type OrcidWorkSummaryItem = {
  putCode: number;
  title: string;
  type: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  visibility: string | null;
  path: string | null;
};

export type OrcidWorkDetailItem = {
  putCode: number;
  title: string;
  type: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  abstract: string | null;
  doi: string | null;
  externalIds: Array<{
    type: string;
    value: string;
    url: string | null;
  }>;
};

export type NormalizedOrcidWork = {
  sourceType: "ORCID";
  sourceId: string;
  title: string;
  journal: string | null;
  year: number | null;
  doi: string | null;
  pubType: string;
  url: string | null;
  abstract: string | null;
};

// Canonical ORCID iD format: four groups of four digits, the final character
// may be 'X' (checksum). Used to reject malformed IDs before they reach the API.
export const ORCID_ID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

export function isValidOrcidId(value: string): boolean {
  return ORCID_ID_PATTERN.test(value.trim().toUpperCase());
}

// Placeholder title used when an ORCID work has no title. Exported so the sync
// can detect it and avoid colliding distinct untitled works on a `title::year`
// dedup key (B55/L3).
export const UNTITLED_WORK_TITLE = "Untitled work";

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseYear(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function humanizeWorkType(value: string | null): string {
  if (!value) return "Unknown";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDoiFromExternalIds(
  externalIds: Array<{ type: string; value: string; url: string | null }>,
): string | null {
  const doi = externalIds.find(
    (item) => item.type.toLowerCase() === "doi" && item.value,
  );
  return doi?.value ?? null;
}

// Retries are opt-in per call (default: none). Used only for the per-member
// summary fetch (one request per member), NOT the per-work detail fetches —
// those run in parallel and already degrade gracefully, so retrying them would
// amplify outbound load on the 512 MB box during an upstream outage.
const RETRY_BASE_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOrcidJson<T>(
  path: string,
  { retries = 0 }: { retries?: number } = {},
): Promise<T> {
  const url = `${ORCID_API_BASE_URL}${path}`;
  const maxAttempts = retries + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    } catch (networkError) {
      // Network-level failure (DNS / reset / timeout) — retry if attempts remain.
      lastError = networkError;
      if (attempt < maxAttempts) {
        await delay(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      throw networkError;
    }

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    // Retry transient upstream errors (5xx); fail fast on client errors (4xx).
    if (response.status >= 500 && attempt < maxAttempts) {
      lastError = new Error(
        `ORCID request failed: ${response.status} ${response.statusText}`,
      );
      await delay(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    const text = await response.text().catch(() => "");
    throw new Error(
      `ORCID request failed: ${response.status} ${response.statusText} ${text}`,
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("ORCID request failed after retries");
}

/**
 * Fetches the flattened list of public work summaries for an ORCID member. The
 * upstream response groups duplicate works; this flattens every group's
 * summaries and drops any entry without a put-code (no stable identifier).
 */
export async function fetchOrcidWorksSummary(
  orcidId: string,
): Promise<OrcidWorkSummaryItem[]> {
  const cleanOrcidId = orcidId.trim();
  // Retry the summary fetch (one request per member) so a transient ORCID blip
  // doesn't abort the member's whole sync — matching the tolerance the per-work
  // detail path already has via its own catch-and-degrade.
  const data = await fetchOrcidJson<OrcidWorksResponse>(
    `/${cleanOrcidId}/works`,
    { retries: 2 },
  );

  const groups = data.group ?? [];

  return groups.flatMap((group) =>
    (group["work-summary"] ?? [])
      .map((summary) => {
        const putCode = summary["put-code"];
        if (!putCode) return null;

        return {
          putCode,
          title:
            asNonEmptyString(summary.title?.title?.value) ?? UNTITLED_WORK_TITLE,
          type: asNonEmptyString(summary.type) ?? "unknown",
          journal: asNonEmptyString(summary["journal-title"]?.value ?? null),
          year: parseYear(
            asNonEmptyString(
              summary["publication-date"]?.year?.value ?? null,
            ),
          ),
          url: asNonEmptyString(summary.url?.value ?? null),
          visibility: asNonEmptyString(summary.visibility ?? null),
          path: asNonEmptyString(summary.path ?? null),
        };
      })
      .filter((item): item is OrcidWorkSummaryItem => item !== null),
  );
}

/**
 * Fetches a single work's full record (abstract, external IDs, DOI) by put-code.
 * Unlike the summary fetch this does not retry: callers run these in parallel
 * and degrade to summary data on failure.
 */
export async function fetchOrcidWorkDetail(
  orcidId: string,
  putCode: number,
): Promise<OrcidWorkDetailItem> {
  const cleanOrcidId = orcidId.trim();
  const data = await fetchOrcidJson<OrcidWorkDetailResponse>(
    `/${cleanOrcidId}/work/${putCode}`,
  );

  const externalIds =
    data["external-ids"]?.["external-id"]?.flatMap((item) => {
      const type = asNonEmptyString(item["external-id-type"]);
      const value = asNonEmptyString(item["external-id-value"]);
      if (!type || !value) return [];

      return [
        {
          type,
          value,
          url: asNonEmptyString(item["external-id-url"]?.value ?? null),
        },
      ];
    }) ?? [];

  return {
    putCode,
    title: asNonEmptyString(data.title?.title?.value) ?? UNTITLED_WORK_TITLE,
    type: asNonEmptyString(data.type) ?? "unknown",
    journal: asNonEmptyString(data["journal-title"]?.value ?? null),
    year: parseYear(
      asNonEmptyString(data["publication-date"]?.year?.value ?? null),
    ),
    url: asNonEmptyString(data.url?.value ?? null),
    abstract: asNonEmptyString(data["short-description"] ?? null),
    doi: getDoiFromExternalIds(externalIds),
    externalIds,
  };
}

/**
 * Fetches and normalises every public work for a member into the shape the
 * publication sync consumes. Detail fetches run in parallel; any that fail fall
 * back to the summary data (no abstract/DOI) rather than aborting the batch.
 */
export async function fetchNormalizedOrcidWorks(
  orcidId: string,
): Promise<NormalizedOrcidWork[]> {
  const summaries = await fetchOrcidWorksSummary(orcidId);

  const detailedWorks = await Promise.all(
    summaries.map(async (summary) => {
      try {
        const detail = await fetchOrcidWorkDetail(orcidId, summary.putCode);

        return {
          sourceType: "ORCID" as const,
          sourceId: String(summary.putCode),
          title: detail.title,
          journal: detail.journal,
          year: detail.year,
          doi: detail.doi,
          pubType: humanizeWorkType(detail.type),
          url: detail.url,
          abstract: detail.abstract,
        };
      } catch (error) {
        console.error(
          `Failed to fetch ORCID work detail for ${orcidId} put-code ${summary.putCode}:`,
          error,
        );

        return {
          sourceType: "ORCID" as const,
          sourceId: String(summary.putCode),
          title: summary.title,
          journal: summary.journal,
          year: summary.year,
          doi: null,
          pubType: humanizeWorkType(summary.type),
          url: summary.url,
          abstract: null,
        };
      }
    }),
  );

  return detailedWorks;
}