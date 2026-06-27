// Admin route that refreshes the publication library from each visible team
// member's ORCID profile. POST → fetches ORCID works + OpenAlex affiliations,
// classifies relevance against the saved filter config, then creates/updates
// rows in place (preserving manual review) while honouring hard-delete
// tombstones. Off-topic works are stored only up to a per-member cap. Returns a
// reconciled per-member summary; an in-process flag rejects overlapping runs
// with 409. No surrounding transaction by design — see the snapshot note below.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchNormalizedOrcidWorks, UNTITLED_WORK_TITLE } from "@/lib/orcid";
import { fetchOrcidAffiliations, lookupAffiliation } from "@/lib/openalex";
import {
  buildPublicationDedupKey,
  classifyPublicationRelevance,
} from "@/lib/publication-filter";
import { loadFilterConfig } from "@/lib/publication-filter-settings";

// Cap on how many off-topic (Rejected) works we persist PER MEMBER so the
// "Rejected" tab is meaningful and false-negatives are recoverable, without
// letting a prolific unrelated author explode the table. Pre-year and clearly
// off-field works beyond this cap are summarised in the response only.
const MAX_STORED_REJECTED_PER_MEMBER = 40;

type SyncMemberResult = {
  teamMember: string;
  orcidId: string;
  worksFound: number;
  created: number;
  updated: number;
  // Works skipped because they predate the configured minimum year.
  skippedBeforeYear: number;
  // Works skipped because they were neither HNU-affiliated nor keyword-relevant.
  skippedNotAffiliated: number;
  // Works skipped because we already saw the same paper for this member.
  skippedDuplicates: number;
  // Works skipped because they match a tombstone (admin hard-deleted them).
  skippedDeleted: number;
  syncedTitles: string[];
  skippedTitles: string[];
  error?: string;
};

type StoredPublication = {
  id: number;
  title: string;
  year: number | null;
  doi: string | null;
  sourceId: string | null;
  authorsRaw: string;
  reviewedManually: boolean;
};

async function syncPublicationsFromOrcid() {
  const config = await loadFilterConfig();

  const members = await prisma.teamMember.findMany({
    where: {
      isVisible: true,
      orcidId: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      orcidId: true,
    },
    orderBy: {
      order: "asc",
    },
  });

  if (members.length === 0) {
    return {
      syncedMembers: 0,
      failedMembers: 0,
      worksFound: 0,
      created: 0,
      updated: 0,
      skippedBeforeYear: 0,
      skippedNotAffiliated: 0,
      skippedDuplicates: 0,
      skippedDeleted: 0,
      libraryTotal: await prisma.publication.count(),
      results: [] as SyncMemberResult[],
      message:
        "No visible team members with an ORCID iD were found. Add an orcidId to a team member first.",
    };
  }

  // Single-writer assumption: we snapshot the library into in-memory maps once,
  // then create/update against them without a surrounding transaction. Wrapping
  // the whole sync in one would hold a SQLite write lock across slow ORCID/
  // OpenAlex network calls (bad at 512 MB), so instead the POST guards against
  // overlapping syncs (the realistic race), and an admin edit made *during* a
  // sync is accepted as self-healing on the next run (B55/L2).
  const existingPublications = await prisma.publication.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      doi: true,
      sourceId: true,
      authorsRaw: true,
      reviewedManually: true,
    },
  });

  const publicationByDoi = new Map<string, StoredPublication>();
  const publicationByTitleYear = new Map<string, StoredPublication>();
  // Untitled, DOI-less works can't be identified by title::year (they'd all
  // collide on "untitled work::year"); match them by their stable sourceId
  // instead so distinct ones stay distinct yet the same one still updates in
  // place across runs (B55/L3).
  const publicationBySourceId = new Map<string, StoredPublication>();

  for (const publication of existingPublications) {
    if (publication.doi?.trim()) {
      publicationByDoi.set(publication.doi.trim().toLowerCase(), publication);
    }
    if (publication.sourceId) {
      publicationBySourceId.set(publication.sourceId, publication);
    }
    publicationByTitleYear.set(
      buildPublicationDedupKey({
        title: publication.title,
        year: publication.year,
      }),
      publication,
    );
  }

  // Tombstones of admin-hard-deleted publications. The sync must NOT re-create a
  // work that matches one — by composite {sourceType, sourceId}, normalized DOI,
  // or title+year key. Loaded once into in-memory sets, mirroring the
  // existing-publication maps above. (DOIs are stored already-normalized by the
  // delete route, but we re-normalize here to be defensive.)
  const tombstones = await prisma.deletedPublication.findMany({
    select: { sourceType: true, sourceId: true, doi: true, titleYearKey: true },
  });
  const tombstonedSourceKeys = new Set<string>();
  const tombstonedDois = new Set<string>();
  const tombstonedTitleYearKeys = new Set<string>();
  for (const tombstone of tombstones) {
    if (tombstone.sourceId) {
      tombstonedSourceKeys.add(`${tombstone.sourceType}::${tombstone.sourceId}`);
    }
    if (tombstone.doi?.trim()) {
      tombstonedDois.add(tombstone.doi.trim().toLowerCase());
    }
    if (tombstone.titleYearKey) {
      tombstonedTitleYearKeys.add(tombstone.titleYearKey);
    }
  }

  let totalWorksFound = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let failedMembers = 0;
  let totalSkippedBeforeYear = 0;
  let totalSkippedNotAffiliated = 0;
  let totalSkippedDuplicates = 0;
  let totalSkippedDeleted = 0;

  const results: SyncMemberResult[] = [];

  for (const member of members) {
    const orcidId = member.orcidId?.trim();
    if (!orcidId) continue;

    try {
      // ORCID works (titles/journals/DOIs) + OpenAlex affiliations (RORs + raw
      // affiliation strings). OpenAlex is best-effort: an empty map just means we
      // fall back to keyword-only classification for this member.
      const [works, affiliations] = await Promise.all([
        fetchNormalizedOrcidWorks(orcidId),
        fetchOrcidAffiliations(orcidId),
      ]);
      totalWorksFound += works.length;

      const result: SyncMemberResult = {
        teamMember: member.name,
        orcidId,
        worksFound: works.length,
        created: 0,
        updated: 0,
        skippedBeforeYear: 0,
        skippedNotAffiliated: 0,
        skippedDuplicates: 0,
        skippedDeleted: 0,
        syncedTitles: [],
        skippedTitles: [],
      };

      const seenThisMember = new Set<string>();
      let storedRejectedThisMember = 0;

      for (const work of works) {
        const affiliation = lookupAffiliation(affiliations, {
          doi: work.doi,
          title: work.title,
          year: work.year,
        });

        const relevance = classifyPublicationRelevance(
          {
            title: work.title,
            journal: work.journal,
            abstract: work.abstract,
            pubType: work.pubType,
            year: work.year,
            affiliationStrings: affiliation.rawAffiliationStrings,
            rors: affiliation.rors,
          },
          config,
        );

        const isBeforeYear = relevance.reasonCode === "BEFORE_MIN_YEAR";

        const doiKey = work.doi?.trim().toLowerCase() || null;
        const titleYearKey = buildPublicationDedupKey({
          title: work.title,
          year: work.year,
        });
        // A DOI-less work carrying the "Untitled work" placeholder can't be
        // identified by title::year — two genuinely different untitled works
        // from the same year would collide and the second would be dropped as a
        // duplicate (B55/L3). Key those on the stable ORCID sourceId (put-code)
        // instead, the same value stored on the row below.
        const candidateSourceId = `${orcidId}:${work.sourceId}`;
        const isUntitledNoDoi = !doiKey && work.title === UNTITLED_WORK_TITLE;

        const dedupKey =
          doiKey ?? (isUntitledNoDoi ? `sourceid::${candidateSourceId}` : titleYearKey);

        if (seenThisMember.has(dedupKey)) {
          result.skippedDuplicates += 1;
          totalSkippedDuplicates += 1;
          continue;
        }
        seenThisMember.add(dedupKey);

        let existing =
          doiKey && publicationByDoi.has(doiKey)
            ? publicationByDoi.get(doiKey) ?? null
            : isUntitledNoDoi
              ? publicationBySourceId.get(candidateSourceId) ?? null
              : publicationByTitleYear.get(titleYearKey) ?? null;

        // Tombstone guard: a previously hard-deleted work must never be re-created
        // by the sync. We only skip when there's NO live row to update — an admin
        // re-adding the paper creates a live row, which legitimately wins. This
        // leaves the cross-member dedup (publicationByDoi/publicationByTitleYear)
        // untouched.
        if (!existing) {
          const candidateSourceKey = `${work.sourceType}::${candidateSourceId}`;
          const isTombstoned =
            tombstonedSourceKeys.has(candidateSourceKey) ||
            (doiKey !== null && tombstonedDois.has(doiKey)) ||
            // For untitled DOI-less works, "untitled work::<year>" is not a real
            // identity (it collides across distinct works), so don't tombstone-
            // match on it — that would silently drop genuinely-different untitled
            // works from a year in which any untitled work was deleted (B55/L3).
            // Such works can still be caught by the sourceId key above.
            (!isUntitledNoDoi && tombstonedTitleYearKeys.has(titleYearKey));
          if (isTombstoned) {
            result.skippedDeleted += 1;
            totalSkippedDeleted += 1;
            continue;
          }
        }

        // For Rejected works that are NOT already in the library, only persist up
        // to the cap; the rest are summarised but not written, so the table stays
        // bounded. (Updates to existing rows always proceed so we keep them fresh.)
        if (relevance.status === "Rejected" && !existing) {
          result.skippedTitles.push(work.title);
          if (isBeforeYear) {
            result.skippedBeforeYear += 1;
            totalSkippedBeforeYear += 1;
          } else {
            result.skippedNotAffiliated += 1;
            totalSkippedNotAffiliated += 1;
          }

          if (storedRejectedThisMember >= MAX_STORED_REJECTED_PER_MEMBER) {
            continue;
          }
          storedRejectedThisMember += 1;
        }

        const matchedAffiliation = relevance.matchedAffiliation.join(", ");
        // Affiliation to persist: the matched unit/ROR phrasing when we matched,
        // else the actual affiliation OpenAlex reported, else empty. Never assert
        // HNU authorship on a work that didn't match — that would contradict the
        // relevanceReason stored alongside it (e.g. "not HNU-affiliated").
        const resolvedAffiliation =
          matchedAffiliation ||
          affiliation.rawAffiliationStrings.find((s) => s.trim())?.trim() ||
          "";

        if (existing) {
          const existingAuthors = existing.authorsRaw
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean);
          const mergedAuthors = existingAuthors.includes(member.name)
            ? existingAuthors
            : [...existingAuthors, member.name];

          // Preserve human review: never overwrite `status` once an admin has
          // approved/rejected this row (reviewedManually = true). We always
          // refresh the metadata fields (matched reason etc.) regardless.
          const updated = await prisma.publication.update({
            where: { id: existing.id },
            data: {
              title: work.title,
              journal: work.journal,
              year: work.year,
              // Don't let a detail-fetch-degraded work (doi:null) wipe a DOI we
              // already have — DOI feeds dedup, so nulling it would re-key the
              // row until the next good sync (B55/L4). A genuinely DOI-less work
              // simply keeps whatever was there, which is harmless.
              doi: work.doi ?? existing.doi,
              pubType: work.pubType,
              url: work.url,
              abstract: work.abstract,
              authorsRaw: mergedAuthors.join(", "),
              orcidSource: orcidId,
              matchedKeywords: relevance.matchedKeywords.join(", "),
              matchedAffiliation,
              relevanceReason: relevance.reason,
              lastSyncedAt: new Date(),
              ...(existing.reviewedManually
                ? {}
                : { status: relevance.status }),
            },
          });

          existing = {
            id: updated.id,
            title: updated.title,
            year: updated.year,
            doi: updated.doi,
            sourceId: existing.sourceId,
            authorsRaw: updated.authorsRaw,
            reviewedManually: updated.reviewedManually,
          };
          result.updated += 1;
          totalUpdated += 1;
          if (relevance.status !== "Rejected") {
            result.syncedTitles.push(work.title);
          }
        } else {
          const created = await prisma.publication.create({
            data: {
              title: work.title,
              authorsRaw: member.name,
              journal: work.journal,
              year: work.year,
              doi: work.doi,
              pubType: work.pubType,
              url: work.url,
              abstract: work.abstract,
              affiliation: resolvedAffiliation,
              sourceType: work.sourceType,
              sourceId: candidateSourceId,
              orcidSource: orcidId,
              status: relevance.status,
              isVisible: true,
              hiddenManually: false,
              matchedKeywords: relevance.matchedKeywords.join(", "),
              matchedAffiliation,
              relevanceReason: relevance.reason,
              reviewedManually: false,
              lastSyncedAt: new Date(),
            },
          });

          existing = {
            id: created.id,
            title: created.title,
            year: created.year,
            doi: created.doi,
            sourceId: created.sourceId,
            authorsRaw: created.authorsRaw,
            reviewedManually: created.reviewedManually,
          };
          // A newly-stored Rejected work (persisted for the Rejected tab, up to
          // the cap) is already counted in skippedBeforeYear/skippedNotAffiliated
          // above — only count genuinely-kept (Approved/Pending) works as "new",
          // so created + updated + skipped reconciles with worksFound.
          if (relevance.status !== "Rejected") {
            result.created += 1;
            totalCreated += 1;
            result.syncedTitles.push(work.title);
          }
        }

        if (existing.doi?.trim()) {
          publicationByDoi.set(existing.doi.trim().toLowerCase(), existing);
        }
        if (existing.sourceId) {
          publicationBySourceId.set(existing.sourceId, existing);
        }
        publicationByTitleYear.set(
          buildPublicationDedupKey({
            title: existing.title,
            year: existing.year,
          }),
          existing,
        );

        // Link the author regardless of status so a later approval already has
        // the team-member association.
        await prisma.publicationAuthor.upsert({
          where: {
            publicationId_teamMemberId: {
              publicationId: existing.id,
              teamMemberId: member.id,
            },
          },
          update: { order: 1 },
          create: {
            publicationId: existing.id,
            teamMemberId: member.id,
            order: 1,
          },
        });
      }

      results.push(result);
    } catch (error) {
      console.error(
        `Failed to sync ORCID works for ${member.name} (${orcidId}):`,
        error,
      );
      failedMembers += 1;
      results.push({
        teamMember: member.name,
        orcidId,
        worksFound: 0,
        created: 0,
        updated: 0,
        skippedBeforeYear: 0,
        skippedNotAffiliated: 0,
        skippedDuplicates: 0,
        skippedDeleted: 0,
        syncedTitles: [],
        skippedTitles: [],
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    syncedMembers: results.length - failedMembers,
    failedMembers,
    worksFound: totalWorksFound,
    created: totalCreated,
    updated: totalUpdated,
    skippedBeforeYear: totalSkippedBeforeYear,
    skippedNotAffiliated: totalSkippedNotAffiliated,
    skippedDuplicates: totalSkippedDuplicates,
    skippedDeleted: totalSkippedDeleted,
    libraryTotal: await prisma.publication.count(),
    results,
  };
}

// In-process guard so two overlapping syncs (e.g. a double-clicked button) can't
// run against each other's stale in-memory snapshot. Single Render instance, so
// a module-level flag is sufficient (B55/L2).
let syncInProgress = false;

export async function POST() {
  if (syncInProgress) {
    return NextResponse.json(
      { error: "A publications sync is already in progress." },
      { status: 409 },
    );
  }
  syncInProgress = true;
  try {
    const result = await syncPublicationsFromOrcid();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/publications/sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync publications from ORCID." },
      { status: 500 },
    );
  } finally {
    syncInProgress = false;
  }
}
