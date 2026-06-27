// Pure helpers for the `row` block's content. No React / server / DB imports, so
// this is safe to use from the admin editor (client), the renderers (client and
// server) and the write-path validator alike.

import {
  type RowChild,
  type RowContent,
  ROW_MAX_COLUMNS,
  ROW_MIN_COLUMNS,
} from "./types";

function asChildArray(value: unknown): RowChild[] {
  return Array.isArray(value) ? (value as RowChild[]) : [];
}

/**
 * Reads a (possibly legacy) row content object into the normalized N-column
 * shape. Never throws and always returns 1–3 columns with a matching `widths`
 * array. Tolerant of:
 *  - legacy `{ variant: "oneColumn", columns: [all, []] }` → one merged column;
 *  - missing/short/invalid `widths` → equal weights;
 *  - more than `ROW_MAX_COLUMNS` columns → overflow folded into the last column
 *    so no child blocks are ever lost.
 */
export function readRowContent(content: Record<string, unknown>): RowContent {
  const rawColumns = Array.isArray(content.columns) ? content.columns : [];
  let columns: RowChild[][] = rawColumns.map(asChildArray);

  // Legacy one-column rows stored two columns with the right one empty.
  if (content.variant === "oneColumn") {
    columns = [columns.flat()];
  }

  if (columns.length < ROW_MIN_COLUMNS) {
    columns = [[]];
  } else if (columns.length > ROW_MAX_COLUMNS) {
    const kept = columns.slice(0, ROW_MAX_COLUMNS);
    const overflow = columns.slice(ROW_MAX_COLUMNS).flat();
    kept[kept.length - 1] = [...kept[kept.length - 1], ...overflow];
    columns = kept;
  }

  return { columns, widths: readWidths(content.widths, columns.length) };
}

/** Coerces a `widths` value to a positive-number array of the given length. */
export function readWidths(raw: unknown, count: number): number[] {
  if (
    Array.isArray(raw) &&
    raw.length === count &&
    raw.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)
  ) {
    return raw as number[];
  }
  return Array.from({ length: count }, () => 1);
}

export interface WidthPreset {
  label: string;
  widths: number[];
}

/** Width-ratio presets offered in the editor for a given column count. */
export function widthPresetsFor(count: number): WidthPreset[] {
  switch (count) {
    case 1:
      return [{ label: "Full width", widths: [1] }];
    case 2:
      return [
        { label: "1 : 1", widths: [1, 1] },
        { label: "2 : 1", widths: [2, 1] },
        { label: "1 : 2", widths: [1, 2] },
        { label: "3 : 2", widths: [3, 2] },
        { label: "2 : 3", widths: [2, 3] },
      ];
    case 3:
      return [
        { label: "1 : 1 : 1", widths: [1, 1, 1] },
        { label: "2 : 1 : 1", widths: [2, 1, 1] },
        { label: "1 : 2 : 1", widths: [1, 2, 1] },
        { label: "1 : 1 : 2", widths: [1, 1, 2] },
      ];
    default:
      return [];
  }
}

/** Equal-weight widths for `count` columns. */
export function equalWidths(count: number): number[] {
  return Array.from({ length: count }, () => 1);
}

export function widthsEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}
