import { describe, expect, it } from "vitest";
import { getSafeHttpUrl, publicationHref } from "@/lib/safe-url";

describe("getSafeHttpUrl", () => {
  it("accepts http(s) URLs and normalises them", () => {
    expect(getSafeHttpUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(getSafeHttpUrl("http://example.com")).toBe("http://example.com/");
    expect(getSafeHttpUrl("  https://example.com/y  ")).toBe(
      "https://example.com/y",
    );
  });

  it("rejects dangerous / non-http(s) schemes", () => {
    expect(getSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeHttpUrl("JavaScript:alert(1)")).toBeNull();
    expect(getSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(getSafeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(getSafeHttpUrl("mailto:a@b.com")).toBeNull();
    expect(getSafeHttpUrl("ftp://example.com/x")).toBeNull();
  });

  it("rejects empty / nullish / malformed values", () => {
    expect(getSafeHttpUrl(null)).toBeNull();
    expect(getSafeHttpUrl(undefined)).toBeNull();
    expect(getSafeHttpUrl("")).toBeNull();
    expect(getSafeHttpUrl("   ")).toBeNull();
    expect(getSafeHttpUrl("not a url")).toBeNull();
  });
});

describe("publicationHref", () => {
  it("uses a valid http(s) url when present", () => {
    expect(
      publicationHref({ url: "https://journal.example/x", doi: "10.2/y" }),
    ).toBe("https://journal.example/x");
  });

  it("falls through to the DOI when the url is empty/missing/unsafe", () => {
    expect(publicationHref({ url: "", doi: "10.1/x" })).toBe(
      "https://doi.org/10.1/x",
    );
    expect(publicationHref({ url: null, doi: "10.1/x" })).toBe(
      "https://doi.org/10.1/x",
    );
    expect(publicationHref({ url: "javascript:alert(1)", doi: "10.1/x" })).toBe(
      "https://doi.org/10.1/x",
    );
  });

  it("returns null when neither a safe url nor a doi is available", () => {
    expect(publicationHref({ url: null, doi: null })).toBeNull();
    expect(publicationHref({ url: "", doi: null })).toBeNull();
    expect(publicationHref({ url: "javascript:alert(1)", doi: null })).toBeNull();
  });
});
