// Pure input-validation / normalisation helpers shared by the public contact
// form (client) and the API routes (server). Deliberately dependency-free and
// WITHOUT `server-only` so the client bundle can import the exact same rules —
// the form and the API must agree on what counts as valid, or a value the user
// is told is fine gets rejected by the server (or vice-versa).

/** Trim a value to a string; non-strings (undefined, numbers, …) become "". */
export function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Loose email check: a single @ with non-space local/domain and a dotted host. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Strip phone formatting (whitespace, dashes, parentheses, dots) down to a bare
 * `+?digits` form. Used ONLY for validation and as the rate-limit key — never
 * as the stored/displayed value (use {@link sanitizePhone} for that).
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

/** Lenient (NZ + international): an optional leading +, then 7–15 digits. */
export function isValidPhone(phone: string): boolean {
  return /^\+?\d{7,15}$/.test(normalizePhone(phone));
}

/**
 * Canonical form to STORE and EMAIL: collapse every whitespace run (including
 * CR/LF and tabs) to a single space, then trim. Keeps human formatting like
 * "+64 21 123 4567" readable while guaranteeing no CR/LF can survive into the
 * plain-text notification email body.
 */
export function sanitizePhone(phone: string): string {
  return asTrimmedString(phone).replace(/\s+/g, " ");
}
