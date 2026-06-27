// Maps a page slug to its public URL. Pure (no imports), so it's safe to use in
// both server components and the client editor.
export function publicPath(slug: string): string {
  if (slug === "home") return "/";
  if (slug === "collaborations-academic") return "/collaborations/academic";
  if (slug === "collaborations-industry") return "/collaborations/industry";
  return `/${slug}`;
}

// Slugs with no public route: the retired "studies" overview (reworked into the
// homepage #studies section) and the internal study-layout pages. Single source
// of truth so the non-public slug rules can't drift — shared by site search
// (which must not surface these as clickable page-content results, since
// publicPath() would point at a 404) and the admin page-editor list filter.
export const RETIRED_PAGE_SLUG = "studies";
export const INTERNAL_PAGE_SLUG_PREFIX = "studylayout-";

export function isPubliclyRoutable(slug: string): boolean {
  return (
    slug !== RETIRED_PAGE_SLUG && !slug.startsWith(INTERNAL_PAGE_SLUG_PREFIX)
  );
}
