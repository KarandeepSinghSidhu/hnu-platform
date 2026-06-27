// Helpers for reading/writing PageBlock.content, which is a JSON string column.

import { getBlockDefinition } from "./registry";
import { readRowContent } from "./row";
import { ROW_MAX_CHILDREN_PER_COLUMN } from "./types";

export type BlockContent = Record<string, unknown>;

// Collision-resistant id (Web Crypto works in both Node 19+ and the browser, so
// this module stays safe to import from client code). Falls back if unavailable.
function genId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Validates and normalizes a `row` block's nested content. Reads the (possibly
// legacy) shape into 1–3 columns with matching widths, then enforces: each child
// has a registered non-row type and object content, and a per-column child cap
// (bounds payload size / nesting). Rows cannot contain rows (one level only).
function normalizeRowContent(
  content: Record<string, unknown>,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const { columns, widths } = readRowContent(content);

  const normalizedColumns = [];
  for (const column of columns) {
    if (column.length > ROW_MAX_CHILDREN_PER_COLUMN) {
      return { ok: false, error: "Too many blocks in a column" };
    }
    const children = [];
    // readRowContent types children as RowChild[] but doesn't verify their
    // shape, so treat each as unknown until validated here.
    for (const child of column as unknown[]) {
      if (!child || typeof child !== "object" || Array.isArray(child)) {
        return { ok: false, error: "Invalid row child" };
      }
      const c = child as Record<string, unknown>;
      if (typeof c.type !== "string" || !getBlockDefinition(c.type)) {
        return { ok: false, error: `Unknown row child type: ${String(c.type)}` };
      }
      if (c.type === "row") {
        return { ok: false, error: "Rows cannot be nested inside rows" };
      }
      const childContent =
        c.content && typeof c.content === "object" && !Array.isArray(c.content)
          ? c.content
          : {};
      children.push({
        id: typeof c.id === "string" ? c.id : genId(),
        type: c.type,
        content: childContent,
      });
    }
    normalizedColumns.push(children);
  }

  return {
    ok: true,
    value: { columns: normalizedColumns, widths },
  };
}

/** Tolerant parse used on the render path — never throws. */
export function parseBlockContent(raw: string | null | undefined): BlockContent {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as BlockContent;
    }
    return {};
  } catch {
    return {};
  }
}

/** Serializes block content for the JSON string column, coercing null/undefined to "{}". */
export function serializeBlockContent(value: unknown): string {
  return JSON.stringify(value ?? {});
}

/**
 * Validates a block type + content for writing. Confirms the type is registered
 * and the content is a plain object. Returns the normalized content string.
 */
export function validateBlockForWrite(
  type: unknown,
  content: unknown,
):
  | { ok: true; type: string; content: string }
  | { ok: false; error: string } {
  if (typeof type !== "string" || !getBlockDefinition(type)) {
    return { ok: false, error: `Unknown block type: ${String(type)}` };
  }
  if (content === undefined || content === null) {
    return { ok: true, type, content: "{}" };
  }
  if (typeof content !== "object" || Array.isArray(content)) {
    return { ok: false, error: "Block content must be an object" };
  }
  if (type === "row") {
    const row = normalizeRowContent(content as Record<string, unknown>);
    if (!row.ok) return row;
    return { ok: true, type, content: serializeBlockContent(row.value) };
  }
  return { ok: true, type, content: serializeBlockContent(content) };
}
