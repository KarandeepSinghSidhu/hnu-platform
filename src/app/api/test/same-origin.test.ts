import { describe, expect, it } from "vitest";

import { isSameOriginOrSafe } from "@/lib/same-origin";

// Build a request whose URL host and Host header both equal `host`, so the
// target host is deterministic regardless of how the runtime treats the Host
// header on a constructed Request.
function req(
  method: string,
  headers: Record<string, string>,
  host = "app.test",
) {
  return new Request(`http://${host}/api/admin/x`, {
    method,
    headers: { host, ...headers },
  });
}

describe("isSameOriginOrSafe (CSRF defence-in-depth)", () => {
  it("allows safe methods regardless of origin", () => {
    expect(isSameOriginOrSafe(req("GET", { origin: "http://evil.test" }))).toBe(
      true,
    );
    expect(isSameOriginOrSafe(req("HEAD", { origin: "http://evil.test" }))).toBe(
      true,
    );
  });

  it("allows a same-origin POST (Origin host matches)", () => {
    expect(
      isSameOriginOrSafe(req("POST", { origin: "http://app.test" })),
    ).toBe(true);
  });

  it("blocks a cross-origin POST", () => {
    expect(
      isSameOriginOrSafe(req("POST", { origin: "http://evil.test" })),
    ).toBe(false);
  });

  it("blocks cross-origin PUT, PATCH and DELETE", () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      expect(
        isSameOriginOrSafe(req(method, { origin: "http://evil.test" })),
      ).toBe(false);
    }
  });

  it("falls back to Referer when Origin is absent", () => {
    expect(
      isSameOriginOrSafe(req("POST", { referer: "http://app.test/admin/login" })),
    ).toBe(true);
    expect(
      isSameOriginOrSafe(req("POST", { referer: "http://evil.test/x" })),
    ).toBe(false);
  });

  it("allows a POST with no Origin/Referer (non-browser client, no victim cookies)", () => {
    expect(isSameOriginOrSafe(req("POST", {}))).toBe(true);
  });

  it("blocks a present-but-malformed Origin on an unsafe method", () => {
    expect(isSameOriginOrSafe(req("POST", { origin: "notaurl" }))).toBe(false);
  });

  it("blocks an opaque 'null' Origin (sandboxed iframe / cross-origin redirect)", () => {
    expect(isSameOriginOrSafe(req("POST", { origin: "null" }))).toBe(false);
  });

  it("falls back to the request URL host when the Host header is absent", () => {
    const r = new Request("http://app.test/api/admin/x", {
      method: "POST",
      headers: { origin: "http://app.test" },
    });
    expect(isSameOriginOrSafe(r)).toBe(true);
  });

  it("compares hosts case-insensitively", () => {
    // Uppercase Host header must still match a lowercase Origin (hostnames are
    // case-insensitive).
    expect(
      isSameOriginOrSafe(req("POST", { origin: "http://app.test" }, "App.Test")),
    ).toBe(true);
  });

  it("matches host:port exactly", () => {
    expect(
      isSameOriginOrSafe(
        req("POST", { origin: "http://app.test:3000" }, "app.test:3000"),
      ),
    ).toBe(true);
    // Same hostname, different port → different origin → blocked.
    expect(
      isSameOriginOrSafe(
        req("POST", { origin: "http://app.test:3001" }, "app.test:3000"),
      ),
    ).toBe(false);
  });
});
