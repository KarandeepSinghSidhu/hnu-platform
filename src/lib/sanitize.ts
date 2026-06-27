import "server-only";
import sanitizeHtml from "sanitize-html";
import { getBlockDefinition } from "@/lib/blocks/registry";
import { parseBlockContent, serializeBlockContent } from "@/lib/blocks/validate";

// Allow-list for admin-authored rich text. Intentionally small: structural and
// inline formatting only — no script/style/iframe/img/event handlers. The
// `server-only` import keeps the (Node) sanitizer out of client bundles.
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "h4",
    "blockquote",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // Force a safe rel on every link to prevent reverse-tabnabbing.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

/** Sanitize a rich-text HTML string. Returns "" for empty/nullish input. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, RICH_TEXT_OPTIONS).trim();
}

/**
 * Returns a block's content JSON string with every richText field sanitized.
 * Used on the study render path, where blocks render in a client component and
 * so can't sanitize at render time the way the server <RichText/> does.
 */
export function sanitizeBlockContent(
  type: string,
  contentString: string,
): string {
  const def = getBlockDefinition(type);
  if (!def) return contentString;

  // Rows hold child blocks — sanitize each child by its own type.
  if (type === "row") {
    const content = parseBlockContent(contentString);
    const columns = Array.isArray(content.columns) ? content.columns : [];
    const sanitizedColumns = columns.map((col) =>
      Array.isArray(col)
        ? col.map((child) => {
            if (!child || typeof child !== "object" || Array.isArray(child)) {
              return child;
            }
            const c = child as { type?: unknown; content?: unknown };
            if (typeof c.type !== "string") return child;
            const childContent =
              c.content && typeof c.content === "object" ? c.content : {};
            return {
              ...c,
              content: parseBlockContent(
                sanitizeBlockContent(
                  c.type,
                  serializeBlockContent(childContent),
                ),
              ),
            };
          })
        : col,
    );
    return serializeBlockContent({ ...content, columns: sanitizedColumns });
  }

  const richKeys = def.fields
    .filter((f) => f.type === "richText")
    .map((f) => f.key);
  if (richKeys.length === 0) return contentString;

  const content = parseBlockContent(contentString);
  let changed = false;
  for (const key of richKeys) {
    if (typeof content[key] === "string") {
      content[key] = sanitizeRichHtml(content[key] as string);
      changed = true;
    }
  }
  return changed ? serializeBlockContent(content) : contentString;
}
