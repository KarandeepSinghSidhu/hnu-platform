import type { FaqItem } from "@/lib/blocks/types";

// A generic expand/collapse list (FAQ). Uses native <details>/<summary> so it's
// keyboard-accessible and works with zero client JS. Content-neutral: every
// question/answer comes from block content. Empty rows are filtered; renders
// nothing when there's no heading and no usable item.
export default function AccordionBlock({
  heading,
  items,
}: {
  heading?: string;
  items: FaqItem[];
}) {
  // A disclosure needs a real question for its summary label; an answer with no
  // question can't be a sensible accordion row, so drop it.
  const rows = (Array.isArray(items) ? items : []).filter(
    (it) => it?.question && it.question.trim(),
  );
  const hasHeading = Boolean(heading && heading.trim());
  if (rows.length === 0 && !hasHeading) return null;
  return (
    <section className="@container w-full bg-white px-6 py-10 sm:px-12 @5xl:px-45">
      <div className="mx-auto max-w-[820px]">
        {hasHeading && (
          <h2
            className="mb-6 text-2xl font-bold text-[#0c0c48] sm:text-3xl"
            style={{ fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.2 }}
          >
            {heading}
          </h2>
        )}
        <div className="flex flex-col gap-3">
          {rows.map((it, i) => (
            <details
              key={i}
              className="group rounded-[20px] border border-[#0c0c48]/10 bg-[#0c0c48]/[0.02] px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[#0c0c48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a4379]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                <span className="min-w-0 break-words">{it.question}</span>
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-xl leading-none text-[#0a4379] transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              {it.answer && it.answer.trim() && (
                <p
                  className="mt-3 whitespace-pre-line text-[#0c0c48]/80"
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "15px",
                    lineHeight: 1.7,
                  }}
                >
                  {it.answer}
                </p>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
