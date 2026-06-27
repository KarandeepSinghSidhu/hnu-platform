import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AFFILIATION_PHRASES,
  DEFAULT_EXCLUSION_KEYWORDS,
  DEFAULT_INSTITUTION_RORS,
  DEFAULT_STRONG_KEYWORDS,
  DEFAULT_WEAK_KEYWORDS,
} from "@/lib/publication-filter";

// --- Mocks ---------------------------------------------------------------

const mockPrisma = vi.hoisted(() => ({
  publicationFilterSetting: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  teamMember: {
    findMany: vi.fn(),
  },
  publication: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  deletedPublication: {
    findMany: vi.fn(),
  },
  publicationAuthor: {
    upsert: vi.fn(),
  },
}));

const mockOrcid = vi.hoisted(() => ({
  fetchNormalizedOrcidWorks: vi.fn(),
  // The sync route imports this constant from @/lib/orcid; the wholesale mock
  // below must re-export it so the route's L3 placeholder check works.
  UNTITLED_WORK_TITLE: "Untitled work",
}));

const mockOpenAlex = vi.hoisted(() => ({
  fetchOrcidAffiliations: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/orcid", () => mockOrcid);
// Mock only fetchOrcidAffiliations; keep the real lookupAffiliation so the map
// keying/lookup logic is exercised.
vi.mock("@/lib/openalex", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/openalex")>("@/lib/openalex");
  return {
    ...actual,
    fetchOrcidAffiliations: mockOpenAlex.fetchOrcidAffiliations,
  };
});

import { POST as syncPost } from "@/app/api/admin/publications/sync/route";
import {
  buildPublicationDedupKey,
  type PublicationFilterConfig,
} from "@/lib/publication-filter";

// A persisted singleton row mirroring the seeded defaults.
const settingRow = {
  id: 1,
  minYear: 1998,
  affiliationPhrases: DEFAULT_AFFILIATION_PHRASES.join("\n"),
  institutionRors: DEFAULT_INSTITUTION_RORS.join("\n"),
  strongKeywords: DEFAULT_STRONG_KEYWORDS.join("\n"),
  weakKeywords: DEFAULT_WEAK_KEYWORDS.join("\n"),
  exclusionKeywords: DEFAULT_EXCLUSION_KEYWORDS.join("\n"),
  updatedAt: new Date(),
};

type WorkInput = {
  sourceId: string;
  title: string;
  journal: string | null;
  year: number | null;
  doi: string | null;
  pubType: string;
  abstract: string | null;
  url: string | null;
};

function work(partial: Partial<WorkInput> & { title: string }): WorkInput & {
  sourceType: "ORCID";
} {
  return {
    sourceType: "ORCID",
    sourceId: partial.sourceId ?? partial.title,
    title: partial.title,
    journal: partial.journal ?? null,
    year: partial.year ?? 2022,
    doi: partial.doi ?? null,
    pubType: partial.pubType ?? "Journal Article",
    abstract: partial.abstract ?? null,
    url: partial.url ?? null,
  };
}

// Loosely-typed shapes for the Prisma call payloads we assert against. The real
// generated types are far richer; we only read a handful of fields here.
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: { id: number }; data: Record<string, unknown> };

// Capture-created rows so we can assert the status the sync chose.
let createdRows: Array<{
  title: string;
  status: string;
  data: Record<string, unknown>;
}>;

function setupHappyPath(opts: {
  members: Array<{ id: number; name: string; orcidId: string }>;
  existing?: Array<{
    id: number;
    title: string;
    year: number | null;
    doi: string | null;
    sourceId?: string | null;
    authorsRaw: string;
    reviewedManually: boolean;
    status: string;
  }>;
}) {
  createdRows = [];
  mockPrisma.publicationFilterSetting.findFirst.mockResolvedValue(settingRow);
  mockPrisma.teamMember.findMany.mockResolvedValue(opts.members);

  const existing = opts.existing ?? [];
  mockPrisma.publication.findMany.mockResolvedValue(
    existing.map((e) => ({
      id: e.id,
      title: e.title,
      year: e.year,
      doi: e.doi,
      // Mirror the real select, which now includes sourceId (B55/L3).
      sourceId: e.sourceId ?? null,
      authorsRaw: e.authorsRaw,
      reviewedManually: e.reviewedManually,
    })),
  );
  mockPrisma.publication.count.mockResolvedValue(existing.length);

  let nextId = 1000;
  mockPrisma.publication.create.mockImplementation((args: CreateArgs) => {
    const { data } = args;
    const row = { id: nextId++, ...data };
    createdRows.push({
      title: String(data.title),
      status: String(data.status),
      data,
    });
    return Promise.resolve(row);
  });

  mockPrisma.publication.update.mockImplementation((args: UpdateArgs) => {
    const { where, data } = args;
    const match = existing.find((e) => e.id === where.id);
    // Emulate the conditional status guard: when reviewedManually is set on the
    // row, the route omits `status` from `data`, so the stored value is kept.
    const status = "status" in data ? data.status : match?.status;
    return Promise.resolve({
      id: where.id,
      title: data.title ?? match?.title,
      year: data.year ?? match?.year ?? null,
      doi: data.doi ?? match?.doi ?? null,
      authorsRaw: data.authorsRaw ?? match?.authorsRaw ?? "",
      reviewedManually: match?.reviewedManually ?? false,
      status,
    });
  });

  mockPrisma.publicationAuthor.upsert.mockResolvedValue({});
  // No tombstones by default; tombstone tests override this.
  mockPrisma.deletedPublication.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ORCID sync — relevance & review preservation", () => {
  it("rejects a pre-1998 work (stored as Rejected so it's reviewable)", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({ title: "Old nutrition study", year: 1990, sourceId: "w1" }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });

    const res = await syncPost();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skippedBeforeYear).toBe(1);
    const created = createdRows.find((r) => r.title === "Old nutrition study");
    expect(created?.status).toBe("Rejected");
    expect(created?.data.relevanceReason).toContain("before 1998");
  });

  it("approves a work whose OpenAlex affiliation names the unit", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({
        title: "Marine sediment cores",
        year: 2022,
        doi: "10.1/unit",
        sourceId: "w2",
      }),
    ]);
    const affMap = new Map([
      [
        "10.1/unit",
        {
          rors: ["03b94tp07"],
          rawAffiliationStrings: [
            "Human Nutrition Unit, University of Auckland",
          ],
        },
      ],
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(affMap);
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });

    const res = await syncPost();
    const body = await res.json();
    expect(body.created).toBe(1);
    const created = createdRows.find((r) => r.title === "Marine sediment cores");
    expect(created?.status).toBe("Approved");
    expect(created?.data.matchedAffiliation).toContain("Human Nutrition Unit");
  });

  it("does NOT auto-approve a UoA-ROR-only work (seabird-researcher case → Pending)", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({
        title: "Breeding ecology of grey-faced petrels",
        year: 2023,
        doi: "10.1/bird",
        sourceId: "w3",
      }),
    ]);
    const affMap = new Map([
      [
        "10.1/bird",
        {
          rors: ["03b94tp07"],
          rawAffiliationStrings: [
            "School of Biological Sciences, University of Auckland",
          ],
        },
      ],
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(affMap);
    setupHappyPath({
      members: [{ id: 1, name: "Dr Bird", orcidId: "0000-0001-9029-0694" }],
    });

    const res = await syncPost();
    await res.json();
    const created = createdRows.find((r) =>
      r.title.startsWith("Breeding ecology"),
    );
    expect(created?.status).toBe("Pending");
    expect(created?.status).not.toBe("Approved");
  });

  it("preserves a manually-reviewed status on re-sync (does not clobber)", async () => {
    // The existing row was manually Rejected; the sync must not overwrite it,
    // whatever the fresh classification would be.
    const title = "A randomised controlled trial of a low-energy diet";
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({ title, year: 2021, doi: "10.1/keep", sourceId: "w4" }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
      existing: [
        {
          id: 7,
          title,
          year: 2021,
          doi: "10.1/keep",
          authorsRaw: "Dr Test",
          reviewedManually: true,
          status: "Rejected",
        },
      ],
    });

    const res = await syncPost();
    const body = await res.json();
    expect(body.updated).toBe(1);

    // The update call for the reviewed row must NOT include `status`.
    const updateCall = mockPrisma.publication.update.mock.calls.find(
      (c) => (c[0] as UpdateArgs).where.id === 7,
    );
    expect(updateCall).toBeDefined();
    expect("status" in (updateCall![0] as UpdateArgs).data).toBe(false);
  });

  it("DOES update status on re-sync when the row was not manually reviewed", async () => {
    const title = "Dietary nutrition and metabolic health outcomes";
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({ title, year: 2021, doi: "10.1/auto", sourceId: "w5" }),
    ]);
    // Names the unit, so it classifies as Approved under the default policy —
    // proving an un-reviewed row's status is refreshed (it was Pending before).
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(
      new Map([
        [
          "10.1/auto",
          {
            rors: ["03b94tp07"],
            rawAffiliationStrings: [
              "Human Nutrition Unit, University of Auckland",
            ],
          },
        ],
      ]),
    );
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
      existing: [
        {
          id: 9,
          title,
          year: 2021,
          doi: "10.1/auto",
          authorsRaw: "Dr Test",
          reviewedManually: false,
          status: "Pending",
        },
      ],
    });

    await syncPost();
    const updateCall = mockPrisma.publication.update.mock.calls.find(
      (c) => (c[0] as UpdateArgs).where.id === 9,
    );
    expect(updateCall).toBeDefined();
    // Auto rows get their status refreshed (unit affiliation → Approved).
    expect((updateCall![0] as UpdateArgs).data.status).toBe("Approved");
  });

  it("returns a friendly message when no members have an ORCID iD", async () => {
    mockPrisma.publicationFilterSetting.findFirst.mockResolvedValue(settingRow);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);
    mockPrisma.publication.count.mockResolvedValue(0);

    const res = await syncPost();
    const body = await res.json();
    expect(body.syncedMembers).toBe(0);
    expect(body.message).toContain("No visible team members");
  });
});

describe("ORCID sync — tombstones (hard-delete permanence)", () => {
  it("skips a work whose DOI matches a tombstone (no resurrection)", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      // Same paper, mixed-case DOI, brand-new put-code — would normally be created.
      work({
        title: "Deleted nutrition paper",
        year: 2022,
        doi: "10.1/DEAD",
        sourceId: "w-new",
      }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });
    mockPrisma.deletedPublication.findMany.mockResolvedValue([
      {
        sourceType: "ORCID",
        sourceId: "0000-0001-0000-0001:w-old",
        doi: "10.1/dead",
        titleYearKey: null,
      },
    ]);

    const res = await syncPost();
    const body = await res.json();
    expect(body.skippedDeleted).toBe(1);
    expect(body.created).toBe(0);
    expect(mockPrisma.publication.create).not.toHaveBeenCalled();
  });

  it("skips a DOI-less work matching a tombstone title+year key (put-code drift)", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      // No DOI and a different sourceId than the deleted row: only the title+year
      // key can catch this — the case the user worried about.
      work({
        title: "Diet study without a DOI",
        year: 2019,
        doi: null,
        sourceId: "w-brand-new",
      }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });
    mockPrisma.deletedPublication.findMany.mockResolvedValue([
      {
        sourceType: "ORCID",
        sourceId: "0000-0001-0000-0001:w-old",
        doi: null,
        titleYearKey: buildPublicationDedupKey({
          title: "Diet study without a DOI",
          year: 2019,
        }),
      },
    ]);

    const res = await syncPost();
    const body = await res.json();
    expect(body.skippedDeleted).toBe(1);
    expect(mockPrisma.publication.create).not.toHaveBeenCalled();
  });

  it("still creates a non-tombstoned work when an unrelated tombstone exists", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({
        title: "Fresh nutrition trial",
        year: 2023,
        doi: "10.1/fresh",
        sourceId: "w-fresh",
      }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });
    mockPrisma.deletedPublication.findMany.mockResolvedValue([
      {
        sourceType: "ORCID",
        sourceId: "0000-0001-0000-0001:w-other",
        doi: "10.1/other",
        titleYearKey: "some other paper::2010",
      },
    ]);

    const res = await syncPost();
    const body = await res.json();
    expect(body.skippedDeleted).toBe(0);
    expect(body.created).toBe(1);
    expect(
      createdRows.find((r) => r.title === "Fresh nutrition trial"),
    ).toBeDefined();
  });
});

describe("ORCID sync — resilience (B55)", () => {
  it("keeps distinct DOI-less 'Untitled work' items from the same year (L3)", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({ title: "Untitled work", year: 2022, doi: null, sourceId: "wa" }),
      work({ title: "Untitled work", year: 2022, doi: null, sourceId: "wb" }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });

    const res = await syncPost();
    const body = await res.json();
    // Before the fix these collapsed onto "untitled work::2022" and the second
    // was dropped as a duplicate; now both are persisted (keyed on put-code).
    expect(body.skippedDuplicates).toBe(0);
    expect(mockPrisma.publication.create).toHaveBeenCalledTimes(2);
  });

  it("updates the same untitled work in place across runs via sourceId, not re-create (L3)", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({ title: "Untitled work", year: 2022, doi: null, sourceId: "wx" }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
      existing: [
        {
          id: 50,
          title: "Untitled work",
          year: 2022,
          doi: null,
          // Stored sourceId form is `${orcidId}:${putCode}`.
          sourceId: "0000-0001-0000-0001:wx",
          authorsRaw: "Dr Test",
          reviewedManually: false,
          status: "Pending",
        },
      ],
    });

    const res = await syncPost();
    expect(res.status).toBe(200);
    // It must match the existing row by sourceId and update it — never create a
    // duplicate untitled row each run.
    expect(mockPrisma.publication.create).not.toHaveBeenCalled();
    const updateCall = mockPrisma.publication.update.mock.calls.find(
      (c) => (c[0] as UpdateArgs).where.id === 50,
    );
    expect(updateCall).toBeDefined();
  });

  it("does not tombstone-drop a distinct untitled work when another untitled work of that year was deleted (L3)", async () => {
    // ORCID returns a genuinely-different untitled DOI-less 2022 work...
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({ title: "Untitled work", year: 2022, doi: null, sourceId: "w-live" }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });
    // ...and a DIFFERENT untitled 2022 work was previously hard-deleted, so its
    // tombstone carries the colliding titleYearKey "untitled work::2022".
    mockPrisma.deletedPublication.findMany.mockResolvedValue([
      {
        sourceType: "ORCID",
        sourceId: "0000-0001-0000-0001:w-deleted",
        doi: null,
        titleYearKey: buildPublicationDedupKey({
          title: "Untitled work",
          year: 2022,
        }),
      },
    ]);

    const res = await syncPost();
    const body = await res.json();
    // The live work has a different sourceId than the tombstone, so it must NOT
    // be skipped as deleted — it is a distinct work and must be created.
    expect(body.skippedDeleted).toBe(0);
    expect(mockPrisma.publication.create).toHaveBeenCalledTimes(1);
  });

  it("still dedups two same-titled, same-year works that DO have a real title (L3 guard)", async () => {
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      work({ title: "A real nutrition paper", year: 2022, doi: null, sourceId: "wa" }),
      work({ title: "A real nutrition paper", year: 2022, doi: null, sourceId: "wb" }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });

    const res = await syncPost();
    const body = await res.json();
    // Real titles still dedup on title::year — only the "Untitled work"
    // placeholder is exempted.
    expect(body.skippedDuplicates).toBe(1);
    expect(mockPrisma.publication.create).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite a known DOI with null on a degraded work (L4)", async () => {
    const title = "Paper with a known DOI";
    mockOrcid.fetchNormalizedOrcidWorks.mockResolvedValue([
      // Detail fetch failed upstream → doi degraded to null, but title+year
      // still match the existing row.
      work({ title, year: 2021, doi: null, sourceId: "w-degraded" }),
    ]);
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
      existing: [
        {
          id: 12,
          title,
          year: 2021,
          doi: "10.1/known",
          authorsRaw: "Dr Test",
          reviewedManually: false,
          status: "Approved",
        },
      ],
    });

    const res = await syncPost();
    expect(res.status).toBe(200);
    const updateCall = mockPrisma.publication.update.mock.calls.find(
      (c) => (c[0] as UpdateArgs).where.id === 12,
    );
    expect(updateCall).toBeDefined();
    expect((updateCall![0] as UpdateArgs).data.doi).toBe("10.1/known");
  });

  it("rejects an overlapping sync with 409 (L2 guard)", async () => {
    let releaseWorks!: (value: unknown[]) => void;
    mockOrcid.fetchNormalizedOrcidWorks.mockReturnValueOnce(
      new Promise<unknown[]>((resolve) => {
        releaseWorks = resolve;
      }),
    );
    mockOpenAlex.fetchOrcidAffiliations.mockResolvedValue(new Map());
    setupHappyPath({
      members: [{ id: 1, name: "Dr Test", orcidId: "0000-0001-0000-0001" }],
    });

    const first = syncPost(); // starts, then hangs inside the per-member fetch
    try {
      await Promise.resolve(); // let the first call set the in-progress flag

      const second = await syncPost();
      expect(second.status).toBe(409);
    } finally {
      // Always release the first sync so the module-level in-progress flag is
      // reset even if the assertion above throws — otherwise it leaks to later
      // tests in this file.
      releaseWorks([]);
      const firstRes = await first;
      expect(firstRes.status).toBe(200);
    }
  });
});

// A tiny guard so the imports above are exercised even if a test is skipped.
describe("test helpers", () => {
  it("dedup key + config types are importable", () => {
    expect(buildPublicationDedupKey({ title: "X", year: 2000 })).toBe(
      "x::2000",
    );
    const cfg: PublicationFilterConfig | null = null;
    expect(cfg).toBeNull();
  });
});
