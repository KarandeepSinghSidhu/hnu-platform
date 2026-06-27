import StudyCard from "@/components/ui/StudyCard";
import type { StudyCardContent } from "@/lib/blocks/types";

// A responsive grid of cards. Used both by the homepage "Study cards row"
// (which sets `anchorId="studies"` for the scroll target) and by the generic,
// reusable "Card grid" block (no anchor — so it can appear anywhere, any number
// of times, without emitting a duplicate/misplaced id). Container-query driven
// so it lays out two columns at full width but stacks inside a narrow row column.
export default function HomepageStudiesBlock({
  cards = [],
  anchorId,
}: {
  cards?: StudyCardContent[];
  anchorId?: string;
}) {
  return (
    // `#studies` anchor (homepage only): the "JOIN A STUDY" hero CTA, study-page
    // breadcrumbs and site search scroll here. scroll-mt clears the fixed navbar.
    <section
      id={anchorId || undefined}
      className={`@container relative w-full bg-white py-10 px-6 sm:px-12 @5xl:px-45 ${anchorId ? "scroll-mt-28" : ""}`}
    >
      <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-8 max-w-[1100px] mx-auto">
        {cards.map((card, i) => (
          <StudyCard
            key={i}
            title={card.title}
            subtitle={card.subtitle}
            description={card.description}
            buttonLabel={card.buttonLabel}
            buttonHref={card.buttonHref}
            imageSrc={card.imageSrc}
            imageAlt={card.imageAlt}
            imagePosition={card.imagePosition}
          />
        ))}
      </div>
    </section>
  );
}
