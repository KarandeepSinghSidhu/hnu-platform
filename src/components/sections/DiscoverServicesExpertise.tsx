export default function DiscoverServicesExpertise() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="max-w-[1512px] mx-auto px-4 sm:px-8 lg:px-[93px]">
        {/*
          items-stretch: image div stretches to match text height at all widths,
          preventing a size mismatch when text wraps at intermediate viewport sizes.
          xl:flex-row: keeps the layout stacked until 1280px so there is enough
          room for the fixed-width image alongside the text.
        */}
        <div className="flex flex-col xl:flex-row items-stretch gap-10 xl:gap-16">
          {/* Image — left, rounded, stretches to match text column height */}
          <div className="flex-shrink-0 w-full xl:w-[534px] min-h-[260px] sm:min-h-[360px] rounded-[30px] overflow-hidden">
            <img
              src="/services-and-expertise.jpg"
              alt="Services and expertise"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Text — right */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h2 className="text-2xl sm:text-3xl lg:text-[48px] font-bold text-[#0a4479] leading-tight tracking-[0.96px] mb-4 sm:mb-6">
              Services &amp; Expertise
            </h2>
            <p className="text-base sm:text-xl lg:text-[30px] font-normal text-[#0a4479] leading-relaxed tracking-[0.6px]">
              The Human Nutrition Unit provides a comprehensive range of services across both
              academic and commercially funded research. These include consultancy on nutrition
              regulatory issues and health claims, trial design and protocol development,
              participant recruitment and screening, and full trial management and coordination.
              The team also delivers data collection, analysis, interpretation, and the
              publication of peer-reviewed scientific research.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
