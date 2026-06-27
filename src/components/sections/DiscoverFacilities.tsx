export default function DiscoverFacilities() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="max-w-[1512px] mx-auto px-4 sm:px-8 lg:px-[93px]">
        {/*
          items-stretch: image div stretches to match text height at all widths.
          xl:flex-row: keeps the layout stacked until 1280px.
        */}
        <div className="flex flex-col xl:flex-row items-stretch gap-10 xl:gap-16">
          {/* Image — left, rounded, stretches to match text column height */}
          <div className="flex-shrink-0 w-full xl:w-[534px] min-h-[260px] sm:min-h-[360px] rounded-[30px] overflow-hidden">
            <img
              src="/facilities.png"
              alt="HNU facilities"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Text — right */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h2 className="text-2xl sm:text-3xl lg:text-[48px] font-bold text-[#0a4479] leading-tight tracking-[0.96px] mb-4 sm:mb-6">
              Facilities
            </h2>
            <p className="text-base sm:text-xl lg:text-[30px] font-normal text-[#0a4479] leading-relaxed tracking-[0.6px]">
              HNU offers a purpose-built research environment designed to support controlled
              human nutrition studies. Facilities include a clinical room for blood collection,
              an indirect calorimetry room for measuring energy expenditure, an interview
              lounge, and a biological sample handling laboratory. The Unit also features a
              metabolic kitchen and five fully furnished residential bedrooms, along with
              bathroom facilities, enabling both short- and long-term live-in studies.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
