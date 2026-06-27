// Admin API for the singleton PublicationFilterSetting that drives the ORCID
// relevance filter (settings UI embedded in /admin/publications).
//   GET → returns the current setting, creating defaults if none exists.
//   PUT → partial update; only keys present in the body are touched, the rest
//         keep their current values. List fields are normalised to newline text
//         and routing rules are validated against their allowed buckets (400 on
//         an out-of-set value — no silent fallback). Off-topic/no-signal rules
//         can never route to Approved.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_MIN_YEAR,
  parseLines,
  type RouteTarget,
} from "@/lib/publication-filter";
import { getOrCreateFilterSetting } from "@/lib/publication-filter-settings";

const ALL_TARGETS: readonly RouteTarget[] = ["Approved", "Pending", "Rejected"];
// Off-topic papers must never auto-approve, so the exclusion rule only accepts
// Pending/Rejected — mirroring the admin UI, which doesn't offer Approved for it.
const NON_APPROVE_TARGETS: readonly RouteTarget[] = ["Pending", "Rejected"];

// Body key -> the buckets that key may be set to. A provided value outside its
// allowed set is a 400 (no silent fallback).
const ROUTE_FIELDS = [
  ["routeUnitAffiliation", ALL_TARGETS],
  ["routeInstitutionKeyword", ALL_TARGETS],
  ["routeStrongKeywords", ALL_TARGETS],
  ["routeWeakMatch", ALL_TARGETS],
  ["routeExclusion", NON_APPROVE_TARGETS],
  // No-signal works should never auto-approve either, so Pending/Rejected only.
  ["routeNoSignal", NON_APPROVE_TARGETS],
] as const satisfies ReadonlyArray<readonly [string, readonly RouteTarget[]]>;

// Reads/writes the singleton PublicationFilterSetting that drives the ORCID
// relevance filter. The settings UI is embedded in /admin/publications.

export async function GET() {
  try {
    const setting = await getOrCreateFilterSetting();
    return NextResponse.json(setting, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/publications/filter-settings failed:", error);
    return NextResponse.json(
      { error: "Failed to load filter settings." },
      { status: 500 },
    );
  }
}

// Coerce/normalise a list field to newline-separated text. Accepts an array of
// strings or a raw string, and splits on BOTH newlines and commas via the shared
// `parseLines` — matching the read path so a comma-pasted value round-trips
// consistently (what's stored == what's displayed == what the classifier parses).
function normalizeListField(value: unknown): string {
  const items = Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === "string" ? parseLines(item) : [],
      )
    : typeof value === "string"
      ? parseLines(value)
      : [];
  return items.join("\n");
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const current = await getOrCreateFilterSetting();

    const data: {
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
    } = {
      minYear: current.minYear,
      affiliationPhrases: current.affiliationPhrases,
      institutionRors: current.institutionRors,
      strongKeywords: current.strongKeywords,
      weakKeywords: current.weakKeywords,
      exclusionKeywords: current.exclusionKeywords,
      routeUnitAffiliation: current.routeUnitAffiliation,
      routeInstitutionKeyword: current.routeInstitutionKeyword,
      routeStrongKeywords: current.routeStrongKeywords,
      routeWeakMatch: current.routeWeakMatch,
      routeExclusion: current.routeExclusion,
      routeNoSignal: current.routeNoSignal,
    };

    if ("minYear" in body) {
      const year = Number(body.minYear);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        return NextResponse.json(
          { error: "minYear must be a year between 1900 and 2100." },
          { status: 400 },
        );
      }
      data.minYear = year;
    } else if (!Number.isInteger(data.minYear)) {
      data.minYear = DEFAULT_MIN_YEAR;
    }

    if ("affiliationPhrases" in body)
      data.affiliationPhrases = normalizeListField(body.affiliationPhrases);
    if ("institutionRors" in body)
      data.institutionRors = normalizeListField(body.institutionRors);
    if ("strongKeywords" in body)
      data.strongKeywords = normalizeListField(body.strongKeywords);
    if ("weakKeywords" in body)
      data.weakKeywords = normalizeListField(body.weakKeywords);
    if ("exclusionKeywords" in body)
      data.exclusionKeywords = normalizeListField(body.exclusionKeywords);

    // Routing rules: each provided value must be one of the buckets allowed for
    // that rule, else 400 so the admin gets clear feedback rather than a silent
    // fallback.
    for (const [key, allowed] of ROUTE_FIELDS) {
      if (!(key in body)) continue;
      const value = (body as Record<string, unknown>)[key];
      if (typeof value !== "string" || !allowed.includes(value as RouteTarget)) {
        return NextResponse.json(
          {
            error: `${key} must be one of ${allowed
              .map((t) => `"${t}"`)
              .join(", ")}.`,
          },
          { status: 400 },
        );
      }
      data[key] = value as RouteTarget;
    }

    const updated = await prisma.publicationFilterSetting.update({
      where: { id: current.id },
      data,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PUT /api/admin/publications/filter-settings failed:", error);
    return NextResponse.json(
      { error: "Failed to update filter settings." },
      { status: 500 },
    );
  }
}
