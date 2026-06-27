// Block-aware machine translation with a DB-backed cache. Server-only.
//
// Two phases:
//   • WARM (write path, on publish/save): collect every translatable string from
//     a page's blocks, translate the ones not already cached, and upsert them.
//   • LOCALIZE (read path, on render when lang=ZH): batch-load the cache and swap
//     translated text into block content. Cache miss → original English (it never
//     calls the API at view time, so the public site renders with no API key).
//
// Cache keys are sha256(sourceText) + format, so an entry is reused until the
// source text changes. Study-detail content is never routed through here.

import "server-only";
import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getBlockDefinition } from "@/lib/blocks/registry";
import { readRowContent } from "@/lib/blocks/row";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { collectAssetAltTexts } from "@/lib/media-resolve";
import {
  getProvider,
  type TargetLang,
  type TranslateFormat,
} from "./provider";
import { getLocalZhFallback } from "./local-fallbacks";

type Content = Record<string, unknown>;
type Visit = (text: string, format: TranslateFormat) => string;
interface Item {
  text: string;
  format: TranslateFormat;
}

// `text`/`textarea` fields that hold technical values (CSS, codes, numbers),
// never natural language. The value heuristic below catches most of these, but
// e.g. `videoId` and a CSS keyword `backgroundColor` ("blue") slip past it.
const NON_TRANSLATABLE_KEYS = new Set([
  "videoId",
  "backgroundColor",
  "backgroundGradient",
  "subtitleMaxWidth",
  "phone",
  "phoneHref",
  "limit",
  "pageSize",
]);

// Skip strings that aren't natural language: empty, no Latin letters (numbers,
// phone numbers, codes, already-CJK), links/paths, or CSS colours/gradients.
function looksTranslatable(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (/^(https?:|tel:|mailto:|\/|#)/i.test(t)) return false;
  if (/(linear-gradient|radial-gradient|rgba?\(|#[0-9a-fA-F]{3,8}\b)/.test(t)) return false;
  return true;
}

function visitField(
  value: unknown,
  key: string,
  format: TranslateFormat,
  visit: Visit,
): unknown {
  if (typeof value !== "string") return value;
  if (NON_TRANSLATABLE_KEYS.has(key)) return value;
  if (!looksTranslatable(value)) return value;
  return visit(value, format);
}

function visitStringArray(value: unknown, visit: Visit): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((v) =>
    typeof v === "string" && looksTranslatable(v) ? visit(v, "text") : v,
  );
}

function mapCardLike(item: unknown, keys: string[], visit: Visit): unknown {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  const obj = item as Record<string, unknown>;
  const out: Record<string, unknown> = { ...obj };
  for (const k of keys) out[k] = visitField(obj[k], k, "text", visit);
  return out;
}

/**
 * Returns a new content object with every translatable field passed through
 * `visit`. Used both to COLLECT strings (visit records and returns input) and to
 * REPLACE them (visit returns the translation). Field selection is driven by the
 * block registry, with structural handling for rows, study cards and updates.
 */
export function mapBlockText(type: string, content: Content, visit: Visit): Content {
  // Rows nest child blocks; translate each child by its own type.
  if (type === "row") {
    const { columns, widths } = readRowContent(content);
    const newColumns = columns.map((col) =>
      col.map((child) => ({
        ...child,
        content: mapBlockText(
          child.type,
          (child.content ?? {}) as Content,
          visit,
        ),
      })),
    );
    return { ...content, columns: newColumns, widths };
  }

  const def = getBlockDefinition(type);
  if (!def) return content;

  const out: Content = { ...content };
  for (const field of def.fields) {
    const value = content[field.key];
    switch (field.type) {
      case "text":
      case "textarea":
        out[field.key] = visitField(value, field.key, "text", visit);
        break;
      case "richText":
        out[field.key] = visitField(value, field.key, "html", visit);
        break;
      case "paragraphArray":
        out[field.key] = visitStringArray(value, visit);
        break;
      case "studyCards":
        if (Array.isArray(value)) {
          out[field.key] = value.map((card) =>
            mapCardLike(
              card,
              ["title", "subtitle", "description", "buttonLabel", "imageAlt"],
              visit,
            ),
          );
        }
        break;
      case "updatesList":
        if (Array.isArray(value)) {
          out[field.key] = value.map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return item;
            }
            const it = item as Record<string, unknown>;
            return {
              ...it,
              title: visitField(it.title, "title", "text", visit),
              date: visitField(it.date, "date", "text", visit),
              paragraphs: visitStringArray(it.paragraphs, visit),
            };
          });
        }
        break;
      case "faqList":
        if (Array.isArray(value)) {
          out[field.key] = value.map((item) =>
            mapCardLike(item, ["question", "answer"], visit),
          );
        }
        break;
      case "statList":
        // `value` is usually a number/figure and is skipped by looksTranslatable;
        // `label` is natural language and gets translated.
        if (Array.isArray(value)) {
          out[field.key] = value.map((item) =>
            mapCardLike(item, ["value", "label"], visit),
          );
        }
        break;
      default:
        break; // image / imageArray / url / enum / boolean → not translatable
    }
  }
  return out;
}

function collectBlockStrings(type: string, content: Content): Item[] {
  const items: Item[] = [];
  mapBlockText(type, content, (text, format) => {
    items.push({ text, format });
    return text;
  });
  return items;
}

const sha256 = (text: string): string =>
  crypto.createHash("sha256").update(text).digest("hex");
const keyOf = (format: TranslateFormat, hash: string): string => `${format}:${hash}`;

// Splits items into request-sized chunks (Azure caps at 1000 items / 50k chars
// per call; stay well under both).
function* chunked(items: Item[], maxCount = 90, maxChars = 45_000): Generator<Item[]> {
  let batch: Item[] = [];
  let chars = 0;
  for (const it of items) {
    if (batch.length > 0 && (batch.length >= maxCount || chars + it.text.length > maxChars)) {
      yield batch;
      batch = [];
      chars = 0;
    }
    batch.push(it);
    chars += it.text.length;
  }
  if (batch.length > 0) yield batch;
}

async function loadCached(
  items: Item[],
  targetLang: TargetLang,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (items.length === 0) return map;
  const hashes = [...new Set(items.map((i) => sha256(i.text)))];
  const rows = await prisma.translationCache.findMany({
    where: { targetLang, sourceHash: { in: hashes } },
    select: { format: true, sourceHash: true, translatedText: true },
  });
  for (const r of rows) {
    map.set(keyOf(r.format as TranslateFormat, r.sourceHash), r.translatedText);
  }
  return map;
}

/**
 * Translate-and-cache the given items. No-op (with a dev warning) when no
 * provider is configured. HTML translations are sanitized before storage.
 */
export async function warmTranslations(
  items: Item[],
  targetLang: TargetLang = "ZH",
): Promise<void> {
  const wanted = new Map<string, Item>();
  for (const it of items) {
    if (it.text.trim()) wanted.set(keyOf(it.format, sha256(it.text)), it);
  }
  if (wanted.size === 0) return;

  const provider = getProvider();
  if (!provider) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[translate] TRANSLATE_API_KEY not set — skipping cache warm; ZH render will fall back to English.",
      );
    }
    return;
  }

  const cached = await loadCached([...wanted.values()], targetLang);
  const missing = [...wanted.entries()]
    .filter(([k]) => !cached.has(k))
    .map(([, v]) => v);
  if (missing.length === 0) return;

  for (const format of ["text", "html"] as TranslateFormat[]) {
    const group = missing.filter((i) => i.format === format);
    for (const chunk of chunked(group)) {
      let translated: string[];
      try {
        translated = await provider.translate({
          texts: chunk.map((c) => c.text),
          targetLang,
          format,
        });
      } catch (err) {
        console.error("[translate] provider error; leaving these uncached:", err);
        continue;
      }
      await Promise.all(
        chunk.map((it, i) => {
          const value =
            format === "html" ? sanitizeRichHtml(translated[i]) : translated[i];
          const sourceHash = sha256(it.text);
          return prisma.translationCache.upsert({
            where: {
              targetLang_format_sourceHash: { targetLang, format, sourceHash },
            },
            create: {
              targetLang,
              format,
              sourceHash,
              sourceText: it.text,
              translatedText: value,
              provider: provider.name,
            },
            update: {
              sourceText: it.text,
              translatedText: value,
              provider: provider.name,
            },
          });
        }),
      );
    }
  }
}

/** WARM phase for a page's blocks (called on publish/save). */
export async function warmBlockTranslations(
  blocks: { type: string; content: Content }[],
  targetLang: TargetLang = "ZH",
): Promise<void> {
  const items: Item[] = [];
  for (const b of blocks) items.push(...collectBlockStrings(b.type, b.content));
  // Asset-fallback alt text: media-resolve injects an asset's library altText
  // into an empty imageAlt at read time — *after* this warm pass — so fold those
  // strings in now, or a 中文 page would serve the untranslated English alt. Gate
  // by the same looksTranslatable check the read path applies to imageAlt, so we
  // don't translate+cache strings the localize pass would never look up.
  const altTexts = await collectAssetAltTexts(blocks.map((b) => b.content));
  for (const text of altTexts) {
    if (looksTranslatable(text)) items.push({ text, format: "text" });
  }
  await warmTranslations(items, targetLang);
}

/** LOCALIZE phase: returns each block's content with cached translations applied. */
export async function localizeBlockContents(
  blocks: { type: string; content: Content }[],
  targetLang: TargetLang = "ZH",
): Promise<Content[]> {
  const items: Item[] = [];
  for (const b of blocks) items.push(...collectBlockStrings(b.type, b.content));
  const cached = await loadCached(items, targetLang);
  return blocks.map((b) =>
    mapBlockText(
      b.type,
      b.content,
      (text, format) =>
        cached.get(keyOf(format, sha256(text))) ??
        (targetLang === "ZH" ? getLocalZhFallback(text, format) : undefined) ??
        text,
    ),
  );
}

/** WARM phase for plain strings (e.g. study titles/short descriptions). */
export async function warmStrings(
  texts: string[],
  targetLang: TargetLang = "ZH",
): Promise<void> {
  await warmTranslations(
    texts.map((text) => ({ text, format: "text" as const })),
    targetLang,
  );
}

/** LOCALIZE phase for plain strings; cache miss → original English. */
export async function localizeStrings(
  texts: string[],
  targetLang: TargetLang = "ZH",
): Promise<string[]> {
  const items: Item[] = texts.map((text) => ({ text, format: "text" as const }));
  const cached = await loadCached(items, targetLang);
  return texts.map(
    (t) =>
      cached.get(keyOf("text", sha256(t))) ??
      (targetLang === "ZH" ? getLocalZhFallback(t, "text") : undefined) ??
      t,
  );
}
