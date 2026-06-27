import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import zh from "@/messages/zh";

type Dict = Record<string, unknown>;

// All leaf key paths (dot-separated) of a nested dictionary object. Arrays are
// treated as leaves (we compare key structure, not list contents).
function leafPaths(obj: Dict, prefix = ""): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...leafPaths(value as Dict, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

// Leaf paths whose value is an empty / whitespace-only string.
function emptyStringPaths(obj: Dict, prefix = ""): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...emptyStringPaths(value as Dict, path));
    } else if (typeof value === "string" && value.trim() === "") {
      paths.push(path);
    }
  }
  return paths;
}

// getDictionary feeds only the active language and types it as `typeof en`, so
// zh must stay structurally in lockstep with en. These tests guard that the two
// dictionaries keep identical key sets (both directions) with no empty values —
// the single source of safety for the per-language dictionary loading.
describe("i18n dictionary parity (en <-> zh)", () => {
  const enPaths = leafPaths(en as Dict).sort();
  const zhPaths = leafPaths(zh as Dict).sort();

  it("has every EN key path in ZH", () => {
    expect(enPaths.filter((p) => !zhPaths.includes(p))).toEqual([]);
  });

  it("has every ZH key path in EN", () => {
    expect(zhPaths.filter((p) => !enPaths.includes(p))).toEqual([]);
  });

  it("has no empty-string values in EN", () => {
    expect(emptyStringPaths(en as Dict)).toEqual([]);
  });

  it("has no empty-string values in ZH", () => {
    expect(emptyStringPaths(zh as Dict)).toEqual([]);
  });
});
