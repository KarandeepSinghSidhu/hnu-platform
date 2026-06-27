import { SITE_NAME, SITE_URL } from "@/lib/constants";

// Shared schema.org builders for the <JsonLd> component. Absolute URLs use the
// build-time SITE_URL (the custom domain in the prod build).

/**
 * Organization identity for the site (rendered once, in the root layout).
 * `parentOrganization` ties HNU Auckland to the University of Auckland.
 */
export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    // Square PNG (generated from the HNU logo) — raster is the safe choice for
    // the schema.org logo property.
    logo: `${SITE_URL}/icon-512.png`,
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "University of Auckland",
      url: "https://www.auckland.ac.nz",
    },
  };
}

/**
 * BreadcrumbList for a page with a visible breadcrumb trail (e.g. study pages).
 * `items` are ordered root → current; paths are relative and made absolute here.
 */
export function breadcrumbSchema(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
