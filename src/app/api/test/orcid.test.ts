import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOrcidWorksSummary } from "@/lib/orcid";

// Minimal Response-likes for the global fetch mock.
const okWorks = () => ({
  ok: true,
  status: 200,
  json: async () => ({ group: [] }),
});
const serverError = () => ({
  ok: false,
  status: 503,
  statusText: "Service Unavailable",
  text: async () => "",
});
const notFound = () => ({
  ok: false,
  status: 404,
  statusText: "Not Found",
  text: async () => "",
});

const ORCID = "0000-0001-0000-0001";

// Regression for B55 / bug-hunt L1: the per-member summary fetch was not
// resilient, so a transient ORCID blip aborted that member's whole sync (the
// per-work detail fetch already degrades gracefully). The summary fetch now
// retries transient failures (network / 5xx) before giving up.
describe("fetchOrcidWorksSummary — transient-failure retry (B55/L1)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries a transient network error, then succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    fetchMock.mockResolvedValueOnce(okWorks());

    await expect(fetchOrcidWorksSummary(ORCID)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a 5xx, then succeeds", async () => {
    fetchMock.mockResolvedValueOnce(serverError());
    fetchMock.mockResolvedValueOnce(okWorks());

    await expect(fetchOrcidWorksSummary(ORCID)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a 4xx (fails fast)", async () => {
    fetchMock.mockResolvedValueOnce(notFound());

    await expect(fetchOrcidWorksSummary(ORCID)).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up (throws) after exhausting retries on a persistent 5xx", async () => {
    fetchMock.mockResolvedValue(serverError());

    await expect(fetchOrcidWorksSummary(ORCID)).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
