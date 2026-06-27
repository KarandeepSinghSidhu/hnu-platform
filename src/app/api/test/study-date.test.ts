import { describe, expect, it } from "vitest";

import { formatStudyDate } from "@/lib/format-study-date";

// Regression for B31 / bug-hunt M1: the study date badge was hardcoded to
// "en-NZ", ignoring the language toggle, so a 中文 visitor saw an English date
// next to a localized status pill. It must follow the active language. The date
// is pinned to Pacific/Auckland so it shows the same NZ calendar day on the
// server and for every visitor (absolute UTC instants below make these
// assertions independent of the test runner's timezone).
describe("formatStudyDate", () => {
  // 2026-06-04T00:00Z == 2026-06-04 12:00 in Pacific/Auckland (NZST, UTC+12).
  const instant = new Date("2026-06-04T00:00:00.000Z");

  it("formats English dates as en-NZ (day month year)", () => {
    expect(formatStudyDate(instant, "en")).toBe("4 June 2026");
  });

  it("formats Chinese dates as zh-CN (年/月/日)", () => {
    expect(formatStudyDate(instant, "zh")).toBe("2026年6月4日");
  });

  it("respects the locale (en and zh differ)", () => {
    expect(formatStudyDate(instant, "en")).not.toBe(
      formatStudyDate(instant, "zh"),
    );
  });

  it("uses NZ time so a UTC-evening instant shows the NZ calendar day, not the previous day", () => {
    // 2026-06-03T13:00Z is already 2026-06-04 01:00 in Pacific/Auckland. A
    // renderer that formatted in UTC (or any tz west of NZ) would show June 3.
    expect(formatStudyDate("2026-06-03T13:00:00.000Z", "en")).toBe(
      "4 June 2026",
    );
    expect(formatStudyDate("2026-06-03T13:00:00.000Z", "zh")).toBe(
      "2026年6月4日",
    );
  });

  it("accepts an ISO date string", () => {
    expect(formatStudyDate("2026-06-04T12:00:00.000Z", "en")).toContain("2026");
  });
});
