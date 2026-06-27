import type { CSSProperties, ReactNode } from "react";

export const NAVBAR_HEIGHT = 180;

export const SUBPAGE_HERO_GRADIENT =
  "linear-gradient(112deg, #092d65 0%, #06699b 50%, #02a8d0 100%)";

type SubpageHeroProps = {
  title: string;
  subtitle: ReactNode;
  subtitleMaxWidth?: number;
  style?: CSSProperties;
};

export default function SubpageHero({
  title,
  subtitle,
  subtitleMaxWidth,
  style,
}: SubpageHeroProps) {
  return (
    <section
      className="relative w-full bg-white overflow-hidden px-6 sm:px-12"
      style={{
        marginTop: 0,
        paddingTop: "clamp(100px, 20vw, 250px)",
        paddingBottom: "clamp(40px, 6vw, 80px)",
        backgroundImage: SUBPAGE_HERO_GRADIENT,
        backgroundColor: "#ffffff",
        minHeight: "clamp(280px, 50vw, 600px)",
        ...style,
      }}
    >
      {/* Māori pattern overlay */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            width: "4000px",
            height: "clamp(120px, 15vw, 250px)",
            top: "100%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-12.38deg)",
            opacity: "clamp(0.05, 0.25, 1)",
            backgroundImage: "url(/maori-pattern.svg)",
            backgroundRepeat: "repeat-x",
            backgroundSize: "auto 100%",
            filter: "brightness(0) invert(1)",
          }}
        />
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto">
        <h1
          className="font-extrabold text-white/75 tracking-[1.52px] leading-normal"
          style={{ fontSize: "clamp(28px, 7vw, 76px)" }}
        >
          {title}
        </h1>
        <p
          className="font-normal text-white/75 tracking-[0.64px] leading-tight mt-3 sm:mt-4"
          style={{
            fontSize: "clamp(14px, 3.5vw, 32px)",
            ...(subtitleMaxWidth !== undefined
              ? { maxWidth: `${subtitleMaxWidth}px` }
              : undefined),
          }}
        >
          {subtitle}
        </p>
      </div>
    </section>
  );
}
