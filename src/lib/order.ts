// Sort-order values are stored in Prisma `Int` columns (32-bit signed). A value
// beyond that range writes to SQLite fine but throws when Prisma reads the row
// back, which can crash any admin list that selects the column. Every endpoint
// that accepts a client-supplied order must funnel it through clampOrder so a
// bad value can never reach the database.
export const MAX_ORDER = 2_147_483_647; // 32-bit signed Int ceiling

/** Coerce any value to a storable order: an integer in [0, MAX_ORDER]. */
export function clampOrder(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  // Fall back when the value isn't usable, then clamp unconditionally so even a
  // bad fallback (negative / out-of-range / NaN) can't reach the database.
  const base = Number.isFinite(n) ? n : Number.isFinite(fallback) ? fallback : 0;
  return Math.min(Math.max(0, Math.trunc(base)), MAX_ORDER);
}
