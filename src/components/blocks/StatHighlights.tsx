import type { StatItem } from "@/lib/blocks/types";

// A generic row of headline figures (e.g. "500+" / "Participants"). Flex-wrap +
// centre keeps any number of stats balanced. Content-neutral; renders nothing
// when there are no usable stats. The `value` is usually a number/figure (not
// translated); the `label` is natural language (translated).
export default function StatHighlights({
  heading,
  items,
}: {
  heading?: string;
  items: StatItem[];
}) {
  const stats = (Array.isArray(items) ? items : []).filter(
    (it) => (it?.value && it.value.trim()) || (it?.label && it.label.trim()),
  );
  if (stats.length === 0) return null;
  const hasHeading = Boolean(heading && heading.trim());
  return (
    <section className="@container w-full bg-white px-6 py-12 sm:px-12 @5xl:px-45">
      <div className="mx-auto max-w-[1100px]">
        {hasHeading && (
          <h2
            className="mb-8 text-center text-2xl font-bold text-[#0c0c48] sm:text-3xl"
            style={{ fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.2 }}
          >
            {heading}
          </h2>
        )}
        <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-8">
          {stats.map((it, i) => (
            <div
              key={i}
              className="flex w-[140px] min-w-0 flex-col items-center break-words text-center sm:w-[180px]"
            >
              <span
                className="max-w-full break-words text-4xl font-bold text-[#0a4379] sm:text-5xl"
                style={{ fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.1 }}
              >
                {it.value}
              </span>
              {it.label && it.label.trim() && (
                <span
                  className="mt-2 max-w-full break-words text-sm text-[#0c0c48]/70"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {it.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
