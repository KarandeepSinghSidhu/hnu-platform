/**
 * Coerce an untrusted numeric input to an integer in `[1, max]`. Non-numeric or
 * non-finite input (null/undefined, "" or "abc") returns `fallback` (itself
 * clamped into range). Shared by CMS-/query-supplied counts like `take`,
 * `limit`, and `pageSize`.
 *
 * Distinct from src/lib/order.ts `clampOrder`, which clamps a display order into
 * `[0, MAX_ORDER]` (zero-based) and is left untouched (it's separately tested).
 */
export function clampPositiveInt(
  value: unknown,
  { fallback, max }: { fallback: number; max: number },
): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  const base = Number.isFinite(n) ? Math.trunc(n) : fallback;
  return Math.min(Math.max(base, 1), max);
}
