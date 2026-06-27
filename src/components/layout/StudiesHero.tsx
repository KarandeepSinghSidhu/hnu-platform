import Image from "next/image";

type ImagePosition = "left" | "right" | "top" | "center" | "bottom";

interface StudyHeroProps {
  imageSrc?: string;
  imageAlt?: string;
  title?: string;
  imagePosition?: ImagePosition;
}

export default function StudyHero({
  imageSrc,
  imageAlt = "",
  title,
  imagePosition = "center",
}: StudyHeroProps) {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight: "clamp(220px, 20vw, 550px)",
        overflow: "hidden",
      }}
    >
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: imagePosition }}
          priority
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 1,
        }}
        aria-hidden="true"
      />
      <div
        className="px-6 sm:px-12 lg:px-45"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: "clamp(24px, 4vw, 50px)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "clamp(28px, 6vw, 76px)",
            fontWeight: 800,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "1.52px",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>
    </section>
  );
}
