// URL-sanitising helpers shared by the homepage and research index. Centralises
// the rule that only http(s) links may be rendered, so user-supplied publication
// urls can't smuggle in javascript:/data: schemes via outbound anchors.

/**
 * Normalises an untrusted value into a safe absolute http(s) url, or null.
 * Returns null for empty/whitespace-only input, unparseable urls, and any
 * non-http(s) scheme (e.g. javascript:, data:, mailto:), making it safe to feed
 * straight into an anchor href.
 */
export function getSafeHttpUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Invalid URL.
  }

  return null;
}

/**
 * Resolves a publication's outbound link: its validated http(s) url, else the
 * DOI as an https://doi.org/ link, else null. getSafeHttpUrl rejects empty /
 * non-http(s) values, so an empty-string url falls through to the DOI. Shared by
 * the homepage cards and the research index so the fallback rule lives in one
 * place.
 */
export function publicationHref(pub: {
  url: string | null;
  doi: string | null;
}): string | null {
  return (
    getSafeHttpUrl(pub.url) ??
    (pub.doi ? getSafeHttpUrl(`https://doi.org/${pub.doi}`) : null)
  );
}
