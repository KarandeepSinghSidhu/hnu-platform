const FOCUS_AREAS = [
  "Obesity and body-weight control",
  "Regulation of appetite",
  "Obesity related metabolic disorders",
  "Cardiovascular risk, including dyslipidaemias",
  "Pre-diabetes and Type 2 diabetes",
  "Metabolism & nutrition",
  "Body Composition"
];

const FOOD_COMPONENTS = [
  "Dietary lipids, including omega-3 fatty acids (fish oils and nuts)",
  "Dietary proteins, including dairy proteins",
  "Dietary carbohydrates, including soluble (ß-glucan) and insoluble dietary fibres",
  "Plant Flavonoids"
];

export default function ResearchFocus() {
  return (
    <section className="bg-white py-10 sm:py-14 lg:py-20 relative z-10">
      <div className="max-w-[1512px] mx-auto px-4 sm:px-8 lg:px-[93px]">
        <div className="flex flex-col lg:flex-row gap-10 sm:gap-14 lg:gap-20 relative">
          {/* Left Column */}
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] mb-4 sm:mb-6 lg:mb-8 leading-tight tracking-[0.72px]">
              Our research focuses on key areas of human nutrition, including:
            </h3>
            <ul className="list-disc list-outside ml-5 sm:ml-7 lg:ml-8 space-y-1 sm:space-y-2">
              {FOCUS_AREAS.map((item) => (
                <li key={item} className="text-base sm:text-xl lg:text-[30px] font-normal text-[#0a4479] leading-7 sm:leading-9 lg:leading-[50px] tracking-[0.72px]">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Vertical Divider */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[3px] bg-[#0a4479]/20 -translate-x-1/2" aria-hidden="true" />

          {/* Horizontal Divider (mobile/tablet) */}
          <div className="block lg:hidden w-full h-[2px] bg-[#0a4479]/20" aria-hidden="true" />

          {/* Right Column */}
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] mb-4 sm:mb-6 lg:mb-8 leading-tight tracking-[0.72px]">
              Research into the health benefits of food components includes:
            </h3>
            <ul className="list-disc list-outside ml-5 sm:ml-7 lg:ml-8 space-y-1 sm:space-y-2">
              {FOOD_COMPONENTS.map((item) => (
                <li key={item} className="text-base sm:text-xl lg:text-[30px] font-normal text-[#0a4479] leading-7 sm:leading-9 lg:leading-[50px] tracking-[0.72px]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 sm:mt-16 lg:mt-24 text-center text-base sm:text-xl lg:text-[30px] font-normal text-[#0a4479] leading-7 sm:leading-9 lg:leading-[50px] tracking-[0.6px] max-w-[1238px] mx-auto">
          We conduct investigations into healthy men and women participants and participants with different states of metabolic health.
        </p>
      </div>
    </section>
  );
}
