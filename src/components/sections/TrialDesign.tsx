import RichText from "@/components/blocks/RichText";
import { TRIAL_DESIGN_DEFAULTS } from "@/lib/blocks/default-content";

interface TrialDesignProps {
  heading?: string;
  intro?: string;
  residentialHeading?: string;
  residentialBody?: string;
  communityHeading?: string;
  communityBody?: string;
}

// The shared prose styling for the body sections. The rich-text bodies render
// their <p> children directly inside this container, so they inherit the size,
// colour, leading and tracking, and `space-y` controls the gaps — matching the
// original mapped paragraphs exactly.
const PROSE_CLASS =
  "text-base sm:text-xl lg:text-[30px] font-normal text-[#0a4479] leading-normal tracking-[0.6px] space-y-5 sm:space-y-6 lg:space-y-8";

export default function TrialDesign({
  heading = TRIAL_DESIGN_DEFAULTS.heading,
  intro = TRIAL_DESIGN_DEFAULTS.intro,
  residentialHeading = TRIAL_DESIGN_DEFAULTS.residentialHeading,
  residentialBody = TRIAL_DESIGN_DEFAULTS.residentialBody,
  communityHeading = TRIAL_DESIGN_DEFAULTS.communityHeading,
  communityBody = TRIAL_DESIGN_DEFAULTS.communityBody,
}: TrialDesignProps = {}) {
  return (
    <section className="bg-white w-full">
      <div className="relative py-10 sm:py-14 lg:py-20 px-4 sm:px-8 lg:px-[93px] max-w-[1512px] mx-auto">
      <div className="bg-white rounded-[20px] sm:rounded-[30px] shadow-[0px_0px_30px_0px_rgba(0,0,0,0.25)] p-6 sm:p-10 lg:p-16">
        <h2 className="text-2xl sm:text-4xl lg:text-[48px] font-bold text-[#0a4479] text-center tracking-[0.96px] mb-6 sm:mb-8 lg:mb-12">
          {heading}
        </h2>

        <RichText
          html={intro}
          className={`${PROSE_CLASS} mb-10 sm:mb-14 lg:mb-20`}
        />

        {/* Residential Trials */}
        <div className="mb-10 sm:mb-14 lg:mb-20">
          <h3 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] text-center tracking-[0.72px] mb-4 sm:mb-6 lg:mb-8">
            {residentialHeading}
          </h3>
          <RichText html={residentialBody} className={PROSE_CLASS} />
        </div>

        {/* Community Trials */}
        <div>
          <h3 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] text-center tracking-[0.72px] mb-4 sm:mb-6 lg:mb-8">
            {communityHeading}
          </h3>
          <RichText html={communityBody} className={PROSE_CLASS} />
        </div>
      </div>
      </div>
    </section>
  );
}
