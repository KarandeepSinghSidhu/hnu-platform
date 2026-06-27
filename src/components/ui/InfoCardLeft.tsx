import Image from "next/image";
import Button from "./Button";
import RichText from "@/components/blocks/RichText";

type BgVariant = "dark" | "standard" | "light";

const bgColors: Record<BgVariant, string> = {
  dark: "#0c0c48f2",
  standard: "#0a4379f2",
  light: "#1a6ab1f2",
};

interface InfoCardProps {
  title: string;
  paragraphs: string[];
  body?: string;
  buttonLabel?: string;
  buttonHref?: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: "center" | "right" | "left" | "top" | "bottom";
  cardBg?: BgVariant;
  showButton?: boolean;
}

export default function InfoCard({
  title,
  paragraphs,
  body,
  buttonLabel = "More Information",
  buttonHref = "#",
  imageSrc,
  imageAlt,
  imagePosition = "center",
  cardBg = "standard",
  showButton = false,
}: InfoCardProps) {
  const textContent = (fontSize: string, gap: string) =>
    body ? (
      <RichText
        html={body}
        className={`flex flex-col ${gap} text-white/85 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
        style={{ fontFamily: "var(--font-inter), sans-serif", fontSize, lineHeight: 1.6 }}
      />
    ) : (
      <div className={`flex flex-col ${gap}`}>
        {paragraphs.map((para, i) => (
          <p key={i} className="text-white/85" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize, lineHeight: 1.6 }}>
            {para}
          </p>
        ))}
      </div>
    );

  const imageEl = (sizes: string, className?: string) =>
    imageSrc ? (
      <Image src={imageSrc} alt={imageAlt} fill className={`object-cover object-${imagePosition} ${className ?? ""}`} sizes={sizes} />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-[#0c0c48]/5 text-sm text-[#0c0c48]/40" aria-hidden="true">
        No image selected
      </div>
    );

  return (
    <section className="relative w-full bg-white overflow-hidden py-6 lg:py-0">

      {/* ── Mobile / small tablet: stacked image + overlapping card ── */}
      <div className="lg:hidden flex flex-col">
        <div className="relative w-full h-[240px] sm:h-[320px]">
          {imageEl("100vw")}
        </div>
        <div className="relative -mt-12 px-4 sm:px-8">
          <div
            className="flex flex-col gap-4 p-6 sm:p-8"
            style={{ backgroundColor: bgColors[cardBg], borderRadius: "0 40px" }}
          >
            <h2 className="text-white font-bold" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(20px, 4vw, 28px)", lineHeight: 1.2 }}>
              {title}
            </h2>
            {textContent("clamp(13px, 2vw, 15px)", "gap-3")}
            {showButton && (
              <div className="mt-2">
                <Button href={buttonHref} variant="white">{buttonLabel}</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop: overlapping two-column design ── */}
      <div className="hidden lg:block py-16 px-12 xl:px-45">
        <div className="max-w-[1100px] mx-auto">
          <div className="relative flex flex-row items-center gap-0">
            {/* Text card */}
            <div
              className="relative z-10 flex-shrink-0 flex flex-col gap-6"
              style={{
                backgroundColor: bgColors[cardBg],
                borderRadius: "0 80px 0 80px",
                width: "clamp(340px, 45vw, 550px)",
                padding: "clamp(32px, 4vw, 60px) clamp(32px, 5vw, 80px) clamp(32px, 4vw, 60px) clamp(24px, 3vw, 60px)",
              }}
            >
              <h2 className="text-white font-bold" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "clamp(22px, 2.5vw, 32px)", lineHeight: 1.2 }}>
                {title}
              </h2>
              {textContent("clamp(14px, 1.2vw, 16px)", "gap-4")}
              {showButton && <Button href={buttonHref} variant="white">{buttonLabel}</Button>}
            </div>

            {/* Image */}
            <div
              className="relative rounded-[30px] overflow-hidden flex-1"
              style={{ height: "clamp(380px, 40vw, 550px)", marginLeft: "clamp(-260px, -10vw, -260px)", zIndex: 9 }}
            >
              {imageEl("70vw")}
            </div>
          </div>
        </div>

        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center" aria-hidden="true">
          <div
            className="w-full h-[200px]"
            style={{
              backgroundImage: "url(/maori-pattern.svg)",
              backgroundRepeat: "repeat-x",
              backgroundSize: "auto 100%",
              filter: "brightness(3) invert(0)",
              opacity: 0.25,
            }}
          />
        </div>
      </div>

    </section>
  );
}