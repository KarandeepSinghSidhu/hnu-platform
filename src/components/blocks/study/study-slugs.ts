// Pure slug helpers for study layouts — no DB/server imports, so they're safe to
// import from client components as well as server code/scripts.

// The shared template applies to every study without its own override.
export const STUDY_TEMPLATE_SLUG = "studylayout-__default__";

// A per-study override Page slug. ("__default__" maps to the template slug.)
export function studyOverrideSlug(studySlug: string): string {
  return `studylayout-${studySlug}`;
}
