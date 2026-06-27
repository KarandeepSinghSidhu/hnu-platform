import { describe, expect, it } from "vitest";

import { getClientIp } from "@/lib/client-ip";

function reqWith(headers: Record<string, string>) {
  return new Request("http://localhost/x", { headers });
}

describe("getClientIp", () => {
  it("takes the rightmost x-forwarded-for entry (the one the trusted proxy appended)", () => {
    // The trusted proxy (Render's LB) appends the real client IP last.
    expect(getClientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" }))).toBe(
      "9.9.9.9",
    );
  });

  it("ignores a spoofed leftmost value", () => {
    // A client pre-seeds x-forwarded-for; the proxy still appends the real IP,
    // so the spoofed leftmost value must not win.
    expect(
      getClientIp(reqWith({ "x-forwarded-for": "evil-spoof, 203.0.113.7" })),
    ).toBe("203.0.113.7");
  });

  it("handles a single x-forwarded-for value", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("supports IPv6 addresses", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "::1, 2001:db8::1" }))).toBe(
      "2001:db8::1",
    );
  });

  it("normalizes bracketed IPv6 with a port", () => {
    expect(
      getClientIp(reqWith({ "x-forwarded-for": "[2001:db8::1]:443" })),
    ).toBe("2001:db8::1");
  });

  it("strips an IPv6 zone id", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "fe80::1%eth0" }))).toBe(
      "fe80::1",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "  203.0.113.9  " }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to x-real-ip when there is no x-forwarded-for", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(
      getClientIp(
        reqWith({
          "x-forwarded-for": "203.0.113.7",
          "x-real-ip": "198.51.100.2",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("returns 'unknown' when no proxy headers are present", () => {
    expect(getClientIp(reqWith({}))).toBe("unknown");
  });

  it("returns 'unknown' for an empty / whitespace-only x-forwarded-for", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": " , " }))).toBe("unknown");
  });

  it("rejects a non-IP rightmost value instead of using it as a key", () => {
    expect(
      getClientIp(reqWith({ "x-forwarded-for": "203.0.113.7, notanip" })),
    ).toBe("unknown");
  });

  it("rejects an IP-shaped but invalid x-real-ip (real validation, not substring)", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "999.999.999.999" }))).toBe(
      "unknown",
    );
  });

  it("rejects an absurdly long header value (key length is bounded)", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "9".repeat(10000) }))).toBe(
      "unknown",
    );
  });
});
