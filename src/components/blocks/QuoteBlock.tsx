// A generic pull-quote / testimonial: a large centred quotation with optional
// attribution (name) and role. Content-neutral; renders nothing without a quote.
export default function QuoteBlock({
  quote,
  attribution,
  role,
}: {
  quote?: string;
  attribution?: string;
  role?: string;
}) {
  const hasQuote = Boolean(quote && quote.trim());
  if (!hasQuote) return null;
  const hasAttribution = Boolean(attribution && attribution.trim());
  const hasRole = Boolean(role && role.trim());
  return (
    <section className="@container w-full bg-white px-6 py-12 sm:px-12 @5xl:px-45">
      <figure className="mx-auto max-w-[820px] text-center">
        <div
          aria-hidden="true"
          className="mb-1 text-5xl leading-none text-[#0a4379]/30"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          &ldquo;
        </div>
        <blockquote
          className="text-2xl font-medium text-[#0c0c48] sm:text-3xl"
          style={{ fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.4 }}
        >
          {quote}
        </blockquote>
        {(hasAttribution || hasRole) && (
          <figcaption
            className="mt-6 text-sm text-[#0c0c48]/70"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {hasAttribution && (
              <span className="font-semibold text-[#0c0c48]">{attribution}</span>
            )}
            {hasAttribution && hasRole && <span aria-hidden="true">, </span>}
            {hasRole && <span>{role}</span>}
          </figcaption>
        )}
      </figure>
    </section>
  );
}
