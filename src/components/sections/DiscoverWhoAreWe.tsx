export default function DiscoverWhoAreWe() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: '#0a4479' }}
    >
      {/*
        Desktop: image is absolutely positioned to fill the right ~56% of the section,
        bleeding flush to the top, right, and bottom edges of the section.
        The gradient overlay fades the image's left edge into the section bg colour.
      */}
      <div
        className="hidden lg:block absolute top-0 bottom-0 right-0"
        style={{ left: '44%' }}
      >
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to right, rgb(10,68,121) 0%, rgba(9,73,126,0.856) 14%, rgba(9,78,130,0.728) 23.4%, rgba(6,104,153,0) 53.3%)',
          }}
        />
        <img
          src="/Discover HNU.jpg"
          alt="HNU building"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Text — constrained to left ~50% on desktop, full-width on mobile/tablet */}
      <div className="relative z-10 max-w-[1512px] mx-auto px-4 sm:px-8 lg:px-[93px] py-14 sm:py-16 lg:py-20 flex flex-col justify-center lg:min-h-[661px]">
        <div className="lg:max-w-[50%]">
          <h2 className="text-3xl sm:text-4xl lg:text-[52px] font-extrabold text-white tracking-[1.04px] leading-tight mb-6 sm:mb-8">
            Who are we
          </h2>
          <div className="space-y-5 text-lg sm:text-xl lg:text-[30px] font-normal text-white leading-relaxed tracking-[0.6px]">
            <p>
              HNU is a University of Auckland research facility, established in 1998 as a
              collaboration between the School of Biological Sciences and the Department of
              Medicine at the University of Auckland.
            </p>
            <p>
              It is New Zealand&apos;s only live-in nutrition trials facility which has the
              capability to carry out long-term human residential studies.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile / tablet: image stacked below text in normal flow */}
      <div className="lg:hidden w-full h-[260px] sm:h-[360px]">
        <img
          src="/Discover HNU.jpg"
          alt="HNU building"
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
}
