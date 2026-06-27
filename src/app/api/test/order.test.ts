import { describe, expect, it } from "vitest";

import { clampOrder, MAX_ORDER } from "@/lib/order";

describe("clampOrder", () => {
  it("keeps an in-range value (number or numeric string)", () => {
    expect(clampOrder(5)).toBe(5);
    expect(clampOrder("7")).toBe(7);
  });

  it("clamps negatives to 0 and out-of-range down to MAX_ORDER", () => {
    expect(clampOrder(-3)).toBe(0);
    expect(clampOrder(9_999_999_999)).toBe(MAX_ORDER);
    expect(clampOrder("9999999999")).toBe(MAX_ORDER);
  });

  it("truncates non-integers", () => {
    expect(clampOrder(3.9)).toBe(3);
  });

  it("falls back for unusable input, but still clamps a bad fallback", () => {
    expect(clampOrder(undefined, 4)).toBe(4);
    // A bad fallback must be clamped, not written through raw — otherwise it
    // could reintroduce the out-of-range Prisma Int crash.
    expect(clampOrder(NaN, -5)).toBe(0);
    expect(clampOrder("nope", 9_999_999_999)).toBe(MAX_ORDER);
    expect(clampOrder(undefined, NaN)).toBe(0);
  });
});
