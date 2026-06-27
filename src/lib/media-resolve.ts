// Server-side bridge between the MediaAsset library and the page-builder blocks
// (plus the DB-field image consumers). It resolves "media:{id}" references to
// real file paths at read time, surfaces a referenced asset's altText as an
// imageAlt fallback, finds everywhere an asset is used (for the "where is this
// used" view / delete guard), and migrates raw-path references when an asset is
// repointed. server-only so the Prisma access never leaks into a client bundle.
import "server-only";
import { prisma } from "@/lib/prisma";
import { parseBlockContent, serializeBlockContent } from "@/lib/blocks/validate";
import { parseMediaRef, toMediaRef } from "@/lib/media-refs";

// Deep-walk a parsed content value, collecting every media-ref id it contains.
function collectIds(value: unknown, ids: Set<number>): void {
  if (typeof value === "string") {
    const id = parseMediaRef(value);
    if (id !== null) ids.add(id);
  } else if (Array.isArray(value)) {
    for (const v of value) collectIds(v, ids);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectIds(v, ids);
  }
}

// Block fields that hold an image source; their alt sibling is always `imageAlt`.
const IMAGE_SRC_KEYS = ["imageSrc", "image"] as const;

// Deep-replace media refs with resolved paths. An unresolved ref becomes "" so a
// dangling reference renders as no-image rather than a literal "media:42".
//
// Additionally, when an object pairs an image source (a "media:{id}" ref) with an
// empty/absent `imageAlt`, surface the asset's library altText as the fallback
// (B23 / A11Y-01) so a well-described asset is described wherever it's used. A
// per-block alt always wins; intentionally-decorative images keep alt="" because
// their asset altText is empty too.
function replaceRefs(
  value: unknown,
  paths: Map<number, string>,
  alts: Map<number, string>,
): unknown {
  if (typeof value === "string") {
    const id = parseMediaRef(value);
    return id !== null ? (paths.get(id) ?? "") : value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => replaceRefs(v, paths, alts));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = replaceRefs(v, paths, alts);
    if (out.imageAlt === undefined || out.imageAlt === "") {
      for (const key of IMAGE_SRC_KEYS) {
        const raw = obj[key];
        const id = typeof raw === "string" ? parseMediaRef(raw) : null;
        const alt = id !== null ? alts.get(id) : undefined;
        if (alt) {
          out.imageAlt = alt;
          break;
        }
      }
    }
    return out;
  }
  return value;
}

function contentHasPath(value: unknown, target: string): boolean {
  if (typeof value === "string") return value === target;
  if (Array.isArray(value)) return value.some((v) => contentHasPath(v, target));
  if (value && typeof value === "object") {
    return Object.values(value).some((v) => contentHasPath(v, target));
  }
  return false;
}

// Deep-replace an exact raw-path string with a new one (used when an asset is
// repointed). Only exact matches are swapped, so a path that's merely a substring
// of another value is left alone.
function replaceRawPath(value: unknown, oldPath: string, newPath: string): unknown {
  if (typeof value === "string") return value === oldPath ? newPath : value;
  if (Array.isArray(value)) {
    return value.map((v) => replaceRawPath(v, oldPath, newPath));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        replaceRawPath(v, oldPath, newPath),
      ]),
    );
  }
  return value;
}

/**
 * Resolves "media:{id}" references in a list of block content JSON strings to
 * the referenced MediaAsset file paths, in one batched query. Raw-path values
 * pass through unchanged (back-compat). Returns the input untouched when there
 * are no references to resolve.
 */
export async function resolveBlockContents(
  contents: string[],
): Promise<string[]> {
  // Cheap fast path: only blocks whose JSON actually contains a "media:" token
  // need parsing/serialization — most pages have none, so skip the work.
  if (!contents.some((c) => c.includes("media:"))) return contents;

  const parsed = contents.map((c) => parseBlockContent(c));
  const ids = new Set<number>();
  for (const c of parsed) collectIds(c, ids);
  if (ids.size === 0) return contents;

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, filePath: true, altText: true },
  });
  const paths = new Map(assets.map((a) => [a.id, a.filePath]));
  const alts = new Map(assets.map((a) => [a.id, a.altText]));
  return parsed.map((c) => serializeBlockContent(replaceRefs(c, paths, alts)));
}

/**
 * Collects the library `altText` of every MediaAsset referenced by these parsed
 * block contents (empties dropped). `replaceRefs` injects this altText into an
 * empty `imageAlt` at READ time — which is after the 中文 translation warm pass —
 * so the warm pass calls this to fold those strings into the cache; otherwise a
 * ZH page would serve the untranslated English fallback. Returns [] (no query)
 * when the contents hold no media refs.
 */
export async function collectAssetAltTexts(
  contents: Record<string, unknown>[],
): Promise<string[]> {
  const ids = new Set<number>();
  for (const c of contents) collectIds(c, ids);
  if (ids.size === 0) return [];
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: [...ids] } },
    select: { altText: true },
  });
  return assets.map((a) => a.altText).filter((t) => t.trim() !== "");
}

export interface MediaUsage {
  /** Where the reference lives: page-builder content, or a DB-field consumer. */
  kind: "block" | "team" | "partner" | "study";
  /** Human-readable summary for the "where is this used" list. */
  label: string;
  pageSlug: string;
  pageTitle: string;
  blockId: number;
  blockType: string;
}

/**
 * Finds everywhere an asset is referenced — page-builder blocks (by id
 * "media:{id}" or raw path) AND the DB-field consumers that store a raw path
 * (team photos, partner logos, study images). Used for the "where is this used"
 * view and to block deletion of an in-use asset.
 *
 * Note: images referenced only by a hardcoded path in component source (.tsx)
 * can't be detected here — that knowledge lives in code, not the database.
 */
export async function findAssetUsage(asset: {
  id: number;
  filePath: string;
}): Promise<MediaUsage[]> {
  const ref = toMediaRef(asset.id);
  const [candidates, teamMembers, partners, studies] = await Promise.all([
    prisma.pageBlock.findMany({
      where: {
        OR: [
          { content: { contains: ref } },
          { content: { contains: asset.filePath } },
        ],
      },
      select: {
        id: true,
        type: true,
        content: true,
        page: { select: { slug: true, title: true } },
      },
    }),
    // DB-field consumers reference images by exact raw path (never "media:{id}").
    prisma.teamMember.findMany({
      where: { photoPath: asset.filePath },
      select: { id: true, name: true },
    }),
    prisma.partnerLogo.findMany({
      where: { logoPath: asset.filePath },
      select: { id: true, name: true },
    }),
    prisma.study.findMany({
      where: { imagePath: asset.filePath },
      select: { id: true, title: true },
    }),
  ]);

  const usage: MediaUsage[] = [];

  // Page-builder blocks. `contains` can over-match (e.g. media:42 inside
  // media:420), so confirm a real id match or an exact raw-path value.
  for (const b of candidates) {
    const content = parseBlockContent(b.content);
    const ids = new Set<number>();
    collectIds(content, ids);
    if (ids.has(asset.id) || contentHasPath(content, asset.filePath)) {
      usage.push({
        kind: "block",
        label: `${b.page.title} — ${b.type}`,
        pageSlug: b.page.slug,
        pageTitle: b.page.title,
        blockId: b.id,
        blockType: b.type,
      });
    }
  }

  for (const m of teamMembers) {
    usage.push({
      kind: "team",
      label: `Team — ${m.name}`,
      pageSlug: "team",
      pageTitle: "Team",
      blockId: m.id,
      blockType: m.name,
    });
  }
  for (const p of partners) {
    usage.push({
      kind: "partner",
      label: `Partner logo — ${p.name}`,
      pageSlug: "partners",
      pageTitle: "Partners",
      blockId: p.id,
      blockType: p.name,
    });
  }
  for (const s of studies) {
    usage.push({
      kind: "study",
      label: `Study — ${s.title}`,
      pageSlug: "studies",
      pageTitle: "Studies",
      blockId: s.id,
      blockType: s.title,
    });
  }

  return usage;
}

/**
 * Repoints raw-path references in page-block content from oldPath to newPath.
 * The MediaPicker stores "media:{id}" references (which resolve to the asset's
 * current filePath automatically, so they need no migration); this only matters
 * for a path typed/pasted directly into a block. Called by the replace route so
 * such blocks keep working — and stay discoverable — after an asset is repointed.
 */
export async function migrateRawPathInBlocks(
  oldPath: string,
  newPath: string,
): Promise<void> {
  if (oldPath === newPath) return;
  const blocks = await prisma.pageBlock.findMany({
    where: { content: { contains: oldPath } },
    select: { id: true, content: true },
  });
  for (const b of blocks) {
    const next = serializeBlockContent(
      replaceRawPath(parseBlockContent(b.content), oldPath, newPath),
    );
    if (next !== b.content) {
      await prisma.pageBlock.update({
        where: { id: b.id },
        data: { content: next },
      });
    }
  }
}
