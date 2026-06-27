import { describe, expect, it } from "vitest";
import { clampPositiveInt } from "@/lib/clamp";

describe("clampPositiveInt", () => {
  const opts = { fallback: 10, max: 100 };

  it("keeps an in-range integer (number or numeric string)", () => {
    expect(clampPositiveInt(5, opts)).toBe(5);
    expect(clampPositiveInt("5", opts)).toBe(5);
  });

  it("floors fractional values", () => {
    expect(clampPositiveInt(5.9, opts)).toBe(5);
  });

  it("clamps values below 1 up to 1", () => {
    expect(clampPositiveInt(0, opts)).toBe(1);
    expect(clampPositiveInt(-3, opts)).toBe(1);
  });

  it("clamps values above max down to max", () => {
    expect(clampPositiveInt(9999, opts)).toBe(100);
  });

  it("uses the fallback for missing / non-numeric input", () => {
    expect(clampPositiveInt(null, opts)).toBe(10);
    expect(clampPositiveInt(undefined, opts)).toBe(10);
    expect(clampPositiveInt("", opts)).toBe(10);
    expect(clampPositiveInt("   ", opts)).toBe(10);
    expect(clampPositiveInt("abc", opts)).toBe(10);
    expect(clampPositiveInt(NaN, opts)).toBe(10);
  });

  it("clamps the fallback into range as well", () => {
    expect(clampPositiveInt("x", { fallback: 0, max: 100 })).toBe(1);
    expect(clampPositiveInt("x", { fallback: 9999, max: 100 })).toBe(100);
  });
});
