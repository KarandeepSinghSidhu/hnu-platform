import { describe, expect, it } from "vitest";

import {
  equalWidths,
  readRowContent,
  widthPresetsFor,
  widthsEqual,
} from "@/lib/blocks/row";
import { parseBlockContent, validateBlockForWrite } from "@/lib/blocks/validate";
import { ROW_MAX_CHILDREN_PER_COLUMN } from "@/lib/blocks/types";

const child = (type = "sectionHeading", extra: Record<string, unknown> = {}) => ({
  id: `id-${type}`,
  type,
  content: {},
  ...extra,
});

describe("readRowContent (tolerant read of row content)", () => {
  it("collapses a legacy oneColumn row into a single merged column", () => {
    const row = readRowContent({
      variant: "oneColumn",
      columns: [[child("a")], [child("b")]],
    });
    expect(row.columns).toHaveLength(1);
    expect(row.columns[0].map((c) => c.type)).toEqual(["a", "b"]);
    expect(row.widths).toEqual([1]);
  });

  it("reads a legacy twoColumn row (no variant) as two columns", () => {
    const row = readRowContent({ columns: [[child("a")], [child("b")]] });
    expect(row.columns).toHaveLength(2);
    expect(row.widths).toEqual([1, 1]);
  });

  it("defaults to equal widths when widths are missing or malformed", () => {
    expect(readRowContent({ columns: [[], []] }).widths).toEqual([1, 1]);
    expect(readRowContent({ columns: [[], []], widths: [2] }).widths).toEqual([
      1, 1,
    ]);
    expect(
      readRowContent({ columns: [[], []], widths: [2, -3] }).widths,
    ).toEqual([1, 1]);
  });

  it("preserves valid positive widths", () => {
    expect(readRowContent({ columns: [[], []], widths: [2, 1] }).widths).toEqual(
      [2, 1],
    );
  });

  it("folds columns beyond the max into the last kept column", () => {
    const row = readRowContent({
      columns: [[child("a")], [child("b")], [child("c")], [child("d")]],
    });
    expect(row.columns).toHaveLength(3);
    expect(row.columns[2].map((c) => c.type)).toEqual(["c", "d"]);
  });

  it("returns a single empty column for empty/garbage content", () => {
    expect(readRowContent({}).columns).toEqual([[]]);
    expect(readRowContent({ columns: "nope" } as never).columns).toEqual([[]]);
  });
});

describe("width helpers", () => {
  it("offers presets matching the column count", () => {
    expect(widthPresetsFor(1)).toHaveLength(1);
    expect(widthPresetsFor(2)).toHaveLength(5);
    expect(widthPresetsFor(3)).toHaveLength(4);
    expect(widthPresetsFor(4)).toHaveLength(0);
  });

  it("equalWidths/widthsEqual behave as expected", () => {
    expect(equalWidths(3)).toEqual([1, 1, 1]);
    expect(widthsEqual([2, 1], [2, 1])).toBe(true);
    expect(widthsEqual([2, 1], [1, 2])).toBe(false);
    expect(widthsEqual([1], [1, 1])).toBe(false);
  });
});

describe("validateBlockForWrite('row', ...)", () => {
  const parse = (content: unknown) => {
    const res = validateBlockForWrite("row", content);
    if (!res.ok) throw new Error(`expected ok, got: ${res.error}`);
    return parseBlockContent(res.content);
  };

  it("normalizes to { columns, widths } and assigns ids to children", () => {
    const out = parse({
      columns: [[{ type: "sectionHeading", content: { text: "x" } }], []],
      widths: [2, 1],
    });
    expect(out.widths).toEqual([2, 1]);
    expect(Array.isArray(out.columns)).toBe(true);
    const first = (out.columns as { id: unknown }[][])[0][0];
    expect(typeof first.id).toBe("string");
    expect((first as { id: string }).id.length).toBeGreaterThan(0);
    expect("variant" in out).toBe(false);
  });

  it("accepts legacy variant input and drops the variant flag", () => {
    const out = parse({ variant: "twoColumn", columns: [[child("sectionHeading")], []] });
    expect("variant" in out).toBe(false);
    expect((out.columns as unknown[]).length).toBe(2);
  });

  it("rejects rows nested inside rows", () => {
    const res = validateBlockForWrite("row", { columns: [[child("row")], []] });
    expect(res.ok).toBe(false);
  });

  it("rejects an unknown child type", () => {
    const res = validateBlockForWrite("row", {
      columns: [[child("not-a-block")], []],
    });
    expect(res.ok).toBe(false);
  });

  it("accepts the new generic blocks as row children", () => {
    const res = validateBlockForWrite("row", {
      columns: [
        [child("prose"), child("imageBlock"), child("quote")],
        [
          child("videoEmbed"),
          child("accordion"),
          child("statHighlights"),
          child("spacer"),
        ],
      ],
      widths: [1, 1],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects a column over the child cap", () => {
    const many = Array.from({ length: ROW_MAX_CHILDREN_PER_COLUMN + 1 }, (_, i) =>
      child("sectionHeading", { id: `n${i}` }),
    );
    const res = validateBlockForWrite("row", { columns: [many, []] });
    expect(res.ok).toBe(false);
  });
});
