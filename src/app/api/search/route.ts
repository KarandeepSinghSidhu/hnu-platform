// Public global type-ahead search. GET /api/search?q=... returns a capped,
// de-duplicated union of matching static pages, studies, team members,
// publications, and published page-content, shaped as SearchResult rows for the
// navbar dropdown. No auth (public endpoint) but per-IP rate limited; only
// public/visible/approved records are searched so it can never leak drafts.
// An exact `contains` pass runs first; a fuzzy (typo-tolerant) pass runs only
// when the exact pass found nothing, to keep the hot path cheap.
import { NextRequest, NextResponse } from "next/server";
import Fuse, { type FuseResultMatch, type IFuseOptions } from "fuse.js";
import { prisma } from "@/lib/prisma";
import { getSafeHttpUrl } from "@/lib/safe-url";
import { parsePublishedSnapshot } from "@/lib/page-publish";
import { publicPath, isPubliclyRoutable } from "@/lib/blocks/page-paths";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

// This handler reads the database on every request, so it must never be
// prerendered or cached — the result depends entirely on the `q` query param.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type SearchResult = {
  type: "study" | "team" | "page" | "publication" | "page-content";
  title: string;
  snippet: string;
  href: string;
};

const PAGES: { title: string; snippet: string; href: string; keywords: string[] }[] = [
  { title: "Home", snippet: "Welcome to the Human Nutrition Unit", href: "/", keywords: ["home", "hnu"] },
  { title: "About / Discover HNU", snippet: "Who we are and what we do", href: "/about", keywords: ["about", "discover", "facility", "facilities"] },
  { title: "Our Team", snippet: "Board of directors, research team, and alumni", href: "/team", keywords: ["team", "people", "board", "directors", "research", "alumni"] },
  { title: "Our Research", snippet: "Research focus areas and trials", href: "/research", keywords: ["research", "trials", "publications"] },
  { title: "Studies", snippet: "Current studies you can join", href: "/#studies", keywords: ["studies", "join", "participant"] },
  { title: "Collaborations", snippet: "Partner with HNU", href: "/collaborations", keywords: ["collaborations", "partners", "industry"] },
  { title: "Donations", snippet: "Support our research", href: "/contact", keywords: ["donations", "donate", "funding"] },
  { title: "Contact", snippet: "Get in touch with our team", href: "/contact", keywords: ["contact", "email", "phone", "address"] },
];

function matchesPage(query: string, page: (typeof PAGES)[number]) {
  const haystack = [page.title, page.snippet, ...page.keywords].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

// How many of each dynamic source we pull from the DB. The final response is
// also capped (RESULT_LIMIT) so the union never overwhelms the dropdown.
const STUDY_TAKE = 8;
const TEAM_TAKE = 8;
const PUBLICATION_TAKE = 8;
const PAGE_CONTENT_TAKE = 6;
const RESULT_LIMIT = 20;

// Per-IP rate limit for the public search endpoint. Generous enough for
// debounced type-ahead, low enough to blunt a DoS against the DB on 512 MB.
const SEARCH_RATE_LIMIT_MAX = 60;
const SEARCH_RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Typo tolerance. The fuzzy pass only runs when the exact `contains` pass left
// the dropdown underfilled, and it scores bounded candidate pools in JS (the
// tables are small — SQLite has no trigram index to lean on). 0.35 ≈ roughly
// one error per three pattern characters, enough for common misspellings
// without matching everything.
const FUZZY_STUDY_TAKE = 50;
const FUZZY_TEAM_TAKE = 50;
const FUZZY_PUBLICATION_TAKE = 50;
const FUZZY_PAGE_TAKE = 20;

const FUZZY_OPTIONS: IFuseOptions<unknown> = {
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
};

// Roughly how much text we keep on either side of a page-content match so the
// snippet reads as a sentence fragment rather than the whole block.
const SNIPPET_RADIUS = 60;
const SNIPPET_MAX = 160;

/**
 * Collapses a block's parsed content (an arbitrary JSON value: strings, arrays,
 * nested row children, etc.) into one whitespace-normalised, HTML-stripped
 * string of its human-readable copy. Keys/numbers/booleans are ignored — only
 * string *values* carry editable text. URLs and image paths are skipped so a
 * query never matches a `/images/...` path or `https://...` link.
 */
function collectText(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return;
    // Skip obvious non-prose: bare paths, URLs, and CSS gradient/colour values.
    if (/^(https?:|\/|#|data:|linear-gradient|rgb|var\()/i.test(trimmed)) return;
    out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectText(v, out);
    }
  }
}

/** Strips HTML tags and decodes a few common entities from richText copy. */
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapses an array of blocks (each a `{ content }` JSON string) to searchable text. */
function blocksToText(blocks: { content: string }[], slug?: string): string {
  const parts: string[] = [];
  for (const [index, block] of blocks.entries()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.content);
    } catch {
      // Don't drop a corrupt block silently — log it (page slug + index) so a
      // malformed block is discoverable instead of just missing from search.
      console.warn(
        `[search] Skipping block with unparseable content (slug=${slug ?? "?"}, index=${index})`,
      );
      continue;
    }
    collectText(parsed, parts);
  }
  return stripHtml(parts.join(" ").replace(/\\n|\n/g, " "));
}

/**
 * Returns the full searchable text of a page's PUBLISHED snapshot, or "" when the
 * page has never been published / has no usable content. Newlines in copy
 * (stored as "\n") are flattened to spaces so they don't break the snippet.
 */
function pageSearchText(publishedContent: string | null, slug?: string): string {
  const blocks = parsePublishedSnapshot(publishedContent);
  if (blocks.length === 0) return "";
  return blocksToText(blocks, slug);
}

/**
 * Builds a readable snippet centred on a known match at `index` spanning
 * `matchLength` characters. The exact path computes the index via `indexOf`;
 * the fuzzy path passes Fuse's match indices (a typo'd query never appears
 * literally in the text, so `indexOf` can't find it).
 */
function buildSnippetAt(text: string, index: number, matchLength: number): string {
  let start = Math.max(0, index - SNIPPET_RADIUS);
  let end = Math.min(text.length, index + matchLength + SNIPPET_RADIUS);

  // Avoid cutting mid-word where there's a nearby space.
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < index) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > index + matchLength) end = space;
  }

  let snippet = text.slice(start, end).trim();
  if (snippet.length > SNIPPET_MAX) snippet = `${snippet.slice(0, SNIPPET_MAX).trimEnd()}…`;
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

/** Builds a readable snippet centred on the first match of `query` in `text`. */
function buildSnippet(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    return text.length > SNIPPET_MAX ? `${text.slice(0, SNIPPET_MAX).trimEnd()}…` : text;
  }
  return buildSnippetAt(text, index, query.length);
}

/**
 * The longest highlighted range Fuse reported for `key` — the most substantial
 * region the fuzzy match latched onto, used to centre the snippet.
 */
function longestMatchRange(
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
): [number, number] | null {
  let best: [number, number] | null = null;
  for (const match of matches ?? []) {
    if (match.key !== key) continue;
    for (const [start, end] of match.indices) {
      if (!best || end - start > best[1] - best[0]) best = [start, end];
    }
  }
  return best;
}

/** A human-friendly slug → page title fallback (e.g. "collaborations-academic"). */
function titleForSlug(slug: string, dbTitle: string): string {
  if (dbTitle && dbTitle.trim()) return dbTitle.trim();
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Row → SearchResult mappers, shared by the exact and fuzzy passes so both
// produce identically-shaped rows.

function studyResult(study: {
  slug: string;
  title: string;
  shortDescription: string;
}): SearchResult {
  return {
    type: "study",
    title: study.title,
    snippet: study.shortDescription,
    href: `/studies/${study.slug}`,
  };
}

function teamResult(member: {
  name: string;
  title: string;
  profileUrl: string | null;
}): SearchResult {
  return {
    type: "team",
    title: member.name,
    snippet: member.title,
    href: getSafeHttpUrl(member.profileUrl) ?? "/team",
  };
}

function publicationResult(publication: {
  title: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  doi: string | null;
}): SearchResult {
  const doiUrl = publication.doi
    ? getSafeHttpUrl(`https://doi.org/${publication.doi.replace(/^https?:\/\/doi\.org\//i, "")}`)
    : null;
  const href = getSafeHttpUrl(publication.url) ?? doiUrl ?? "/research";
  const snippet = [publication.journal, publication.year ? String(publication.year) : null]
    .filter(Boolean)
    .join(" · ");
  return {
    type: "publication",
    title: publication.title,
    snippet: snippet || "Publication",
    href,
  };
}

/**
 * Fuzzy fallback for typo'd queries. Fetches bounded candidate pools (the same
 * visibility filters as the exact pass, minus the `contains` constraint) and
 * scores them with Fuse. Returns rows not already found by the exact pass,
 * best-scored first within each group, in the same group order as the exact
 * pass (static pages, studies, team, publications, page-content).
 */
async function fuzzySearch(
  q: string,
  existing: SearchResult[],
): Promise<SearchResult[]> {
  const [studies, teamMembers, publications, pages] = await Promise.all([
    prisma.study.findMany({
      where: { isActive: true },
      select: { slug: true, title: true, shortDescription: true, category: true },
      take: FUZZY_STUDY_TAKE,
    }),
    prisma.teamMember.findMany({
      where: { isVisible: true },
      select: { name: true, title: true, bio: true, profileUrl: true },
      take: FUZZY_TEAM_TAKE,
    }),
    prisma.publication.findMany({
      where: { status: "Approved", isVisible: true, hiddenManually: false },
      select: { title: true, journal: true, authorsRaw: true, year: true, url: true, doi: true },
      orderBy: { year: "desc" },
      take: FUZZY_PUBLICATION_TAKE,
    }),
    prisma.page.findMany({
      select: {
        slug: true,
        title: true,
        publishedContent: true,
        blocks: {
          where: { isVisible: true },
          orderBy: { position: "asc" },
          select: { content: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: FUZZY_PAGE_TAKE,
    }),
  ]);

  // Dedupe against the exact pass: identical rows by (type, title, href), and
  // page destinations by href — the same rule the exact pass applies between
  // the static PAGES list and page-content rows.
  const seenRows = new Set(existing.map((r) => `${r.type}|${r.title}|${r.href}`));
  const seenHrefs = new Set(existing.map((r) => r.href));
  const out: SearchResult[] = [];
  const push = (result: SearchResult) => {
    const key = `${result.type}|${result.title}|${result.href}`;
    if (seenRows.has(key)) return;
    seenRows.add(key);
    out.push(result);
  };

  const pageListFuse = new Fuse(
    PAGES.map((p) => ({ ...p, keywordsText: p.keywords.join(" ") })),
    {
      ...FUZZY_OPTIONS,
      keys: [
        { name: "title", weight: 0.5 },
        { name: "keywordsText", weight: 0.3 },
        { name: "snippet", weight: 0.2 },
      ],
    },
  );
  for (const hit of pageListFuse.search(q)) {
    push({
      type: "page",
      title: hit.item.title,
      snippet: hit.item.snippet,
      href: hit.item.href,
    });
    seenHrefs.add(hit.item.href);
  }

  const studyFuse = new Fuse(studies, {
    ...FUZZY_OPTIONS,
    keys: [
      { name: "title", weight: 0.6 },
      { name: "shortDescription", weight: 0.3 },
      { name: "category", weight: 0.1 },
    ],
  });
  for (const hit of studyFuse.search(q)) push(studyResult(hit.item));

  const teamFuse = new Fuse(teamMembers, {
    ...FUZZY_OPTIONS,
    keys: [
      { name: "name", weight: 0.6 },
      { name: "title", weight: 0.25 },
      { name: "bio", weight: 0.15 },
    ],
  });
  for (const hit of teamFuse.search(q)) push(teamResult(hit.item));

  const publicationFuse = new Fuse(publications, {
    ...FUZZY_OPTIONS,
    keys: [
      { name: "title", weight: 0.6 },
      { name: "journal", weight: 0.25 },
      { name: "authorsRaw", weight: 0.15 },
    ],
  });
  for (const hit of publicationFuse.search(q)) push(publicationResult(hit.item));

  // Page-content: flatten each page to its public text (published snapshot
  // first, draft blocks only for never-published pages — same rule as the
  // exact pass, so fuzzy can't leak unpublished draft edits either).
  const pageDocs = pages
    .map((page) => ({
      slug: page.slug,
      title: page.title,
      href: publicPath(page.slug),
      text: page.publishedContent
        ? pageSearchText(page.publishedContent, page.slug)
        : blocksToText(page.blocks, page.slug),
    }))
    .filter(
      (page) =>
        page.text && !seenHrefs.has(page.href) && isPubliclyRoutable(page.slug),
    );
  const pageContentFuse = new Fuse(pageDocs, {
    ...FUZZY_OPTIONS,
    keys: [
      { name: "title", weight: 0.3 },
      { name: "text", weight: 0.7 },
    ],
  });
  for (const hit of pageContentFuse.search(q)) {
    if (seenHrefs.has(hit.item.href)) continue;
    const range = longestMatchRange(hit.matches, "text");
    push({
      type: "page-content",
      title: titleForSlug(hit.item.slug, hit.item.title),
      snippet: range
        ? buildSnippetAt(hit.item.text, range[0], range[1] - range[0] + 1)
        : buildSnippet(hit.item.text, q),
      href: hit.item.href,
    });
    seenHrefs.add(hit.item.href);
  }

  return out;
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ query: q, results: [] });
  }

  if (q.length > 100) {
    return NextResponse.json(
      { error: "Query too long." },
      { status: 400 },
    );
  }

  // Throttle per client IP, after the length guards so trivial type-ahead
  // (q < 2) never spends budget. The IP comes from the trusted-proxy helper, so
  // it can't be cheaply spoofed to dodge the limit or flood the limiter's map.
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`search:${ip}`, {
    max: SEARCH_RATE_LIMIT_MAX,
    windowMs: SEARCH_RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Too many requests. Please slow down.");
  }

  try {
    const [studies, teamMembers, publications, pages] = await Promise.all([
      prisma.study.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q } },
            { shortDescription: { contains: q } },
            { category: { contains: q } },
          ],
        },
        select: {
          slug: true,
          title: true,
          shortDescription: true,
        },
        take: STUDY_TAKE,
      }),
      prisma.teamMember.findMany({
        where: {
          isVisible: true,
          OR: [
            { name: { contains: q } },
            { title: { contains: q } },
            { bio: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          title: true,
          profileUrl: true,
        },
        take: TEAM_TAKE,
      }),
      prisma.publication.findMany({
        where: {
          status: "Approved",
          isVisible: true,
          hiddenManually: false,
          OR: [
            { title: { contains: q } },
            { journal: { contains: q } },
            { authorsRaw: { contains: q } },
          ],
        },
        select: {
          title: true,
          journal: true,
          year: true,
          url: true,
          doi: true,
        },
        orderBy: { year: "desc" },
        take: PUBLICATION_TAKE,
      }),
      // Page-content search. SQLite `contains` is case-insensitive for ASCII, so
      // this prefilters pages whose published snapshot — or, for never-published
      // pages, whose visible draft blocks — mention the query. The public renderer
      // shows the published snapshot when present and otherwise falls back to the
      // live blocks, so we mirror that when choosing the text to match + snippet.
      prisma.page.findMany({
        where: {
          OR: [
            { publishedContent: { contains: q } },
            { blocks: { some: { isVisible: true, content: { contains: q } } } },
          ],
        },
        select: {
          slug: true,
          title: true,
          publishedContent: true,
          blocks: {
            where: { isVisible: true },
            orderBy: { position: "asc" },
            select: { content: true },
          },
        },
        take: PAGE_CONTENT_TAKE,
      }),
    ]);

    const results: SearchResult[] = [];
    const seenHrefs = new Set<string>();

    for (const page of PAGES) {
      if (matchesPage(q, page)) {
        results.push({
          type: "page",
          title: page.title,
          snippet: page.snippet,
          href: page.href,
        });
        seenHrefs.add(page.href);
      }
    }

    for (const study of studies) {
      results.push(studyResult(study));
    }

    for (const member of teamMembers) {
      results.push(teamResult(member));
    }

    for (const publication of publications) {
      results.push(publicationResult(publication));
    }

    for (const page of pages) {
      // Skip pages with no public route (e.g. the retired /studies overview).
      if (!isPubliclyRoutable(page.slug)) continue;
      const href = publicPath(page.slug);
      // A static PAGES entry already linked this destination for this query —
      // don't add a near-duplicate page-content row for it.
      if (seenHrefs.has(href)) continue;
      // Mirror the public renderer: use the published snapshot when present, else
      // fall back to the page's visible draft blocks (never-published pages).
      const text = page.publishedContent
        ? pageSearchText(page.publishedContent, page.slug)
        : blocksToText(page.blocks, page.slug);
      if (!text || !text.toLowerCase().includes(q.toLowerCase())) continue;
      results.push({
        type: "page-content",
        title: titleForSlug(page.slug, page.title),
        snippet: buildSnippet(text, q),
        href,
      });
      seenHrefs.add(href);
    }

    // Typo tolerance: only when the exact pass found nothing do we fall back to
    // a fuzzy pass, so close misspellings still surface results. Keeping this a
    // zero-result fallback (rather than topping up any underfilled dropdown)
    // means well-spelled queries never pay for the fuzzy pass's extra DB reads
    // and in-JS scoring on the type-ahead hot path.
    if (results.length === 0) {
      results.push(...(await fuzzySearch(q, results)));
    }

    return NextResponse.json({ query: q, results: results.slice(0, RESULT_LIMIT) });
  } catch (error) {
    console.error("GET /api/search failed:", error);
    return NextResponse.json(
      { error: "Search failed." },
      { status: 500 },
    );
  }
}
