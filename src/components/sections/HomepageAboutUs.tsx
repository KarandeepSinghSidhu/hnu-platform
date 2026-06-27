import Image from "next/image";

export default function HomepageAboutUs() {
  return (
    <section
      style={{
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        marginTop: "0px",
        marginBottom: "0px",
        paddingTop: "50px",
        paddingBottom: "50px",
        paddingLeft: "50px",
        paddingRight: "50px",
        backgroundColor: "#ffffff",

      }}
      aria-label="Homepage studies section"
      className="overflow-visible"
    >
      <div className="mt-22 overflow-hidden rounded-[30px] shadow-[0_15px_30px_rgba(0,0,0,0.12)]">
        <div className="relative h-180 w-full">
          <Image
            src="/1630363804706 (1).jpg"
            alt="HNU team member standing by blue railings"
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover object-top w-full h-full"
          />
          {/* Blue overlay */}
          <div className="absolute inset-0 z-[5] bg-[linear-gradient(to_right,#0A4479_0%,#0A4479_40%,rgba(10,68,121,0)_70%,rgba(10,68,121,0)_100%)]" />

          {/* Text container */}
          <div className="absolute inset-0 z-10 flex items-center pl-[90px] text-white">
            <div className="h-[550px] w-[450px] flex flex-col gap-5">
              <h2
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "54px",
                  fontWeight: 800,
                }}
              >
                About Us
              </h2>

              <p
                className="mt-8 max-w-[620px] leading-[1.35]"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "28px",
                  fontWeight: 400,
                }}
              >
                HNU is a nutrition research facility within The University of
                Auckland, New Zealand&apos;s most prestigious and largest
                University.
              </p>

              <p
                className="mt-8 max-w-[620px] leading-[1.35]"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "28px",
                  fontWeight: 400,
                }}
              >
                The Unit undertakes research to establish links between diet,
                health and disease prevention.
              </p>

              <a
                href="/about"
                className="mt-10 inline-flex text-white underline underline-offset-4"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "20px",
                  fontWeight: 400,
                }}
              >
                Read More &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
