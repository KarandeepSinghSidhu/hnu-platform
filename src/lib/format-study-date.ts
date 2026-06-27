// Study pages localise everything via the language toggle, but the date badge
// was hardcoded to "en-NZ", so a 中文 visitor saw an English-formatted date next
// to a localized status pill. Format the date in the active UI language instead.
//
// The timezone is pinned to Pacific/Auckland (the studies are NZ-based) so the
// badge shows the same NZ calendar day for every visitor and for the server,
// rather than drifting with the renderer's timezone (which would show the
// previous day to visitors west of UTC and cause an SSR/client hydration
// mismatch).
export function formatStudyDate(value: Date | string, lang: "en" | "zh"): string {
  return new Date(value).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Pacific/Auckland",
  });
}
