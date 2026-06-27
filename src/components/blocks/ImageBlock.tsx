import Image from "next/image";

const HEIGHTS = {
  small: "h-[240px]",
  medium: "h-[400px]",
  large: "h-[560px]",
} as const;

// A generic full-width image with an optional caption. Empty-safe: when no image
// is chosen it renders a neutral placeholder instead of passing "" to next/image
// (which throws). Image fields are keyed `imageSrc`/`imageAlt` so media-resolve
// turns library refs into real paths and supplies the asset alt-text fallback.
export default function ImageBlock({
  imageSrc,
  imageAlt = "",
  caption,
  height = "medium",
  rounded = true,
}: {
  imageSrc?: string;
  imageAlt?: string;
  caption?: string;
  height?: "small" | "medium" | "large";
  rounded?: boolean;
}) {
  const heightClass = HEIGHTS[height] ?? HEIGHTS.medium;
  const radius = rounded ? "rounded-[28px]" : "rounded-none";
  const hasCaption = Boolean(caption && caption.trim());
  return (
    <section className="@container w-full bg-white px-6 py-10 sm:px-12 @5xl:px-45">
      <figure className="mx-auto max-w-[1100px]">
        <div className={`relative w-full ${heightClass} overflow-hidden ${radius}`}>
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1100px) 100vw, 1100px"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-[#0c0c48]/5 text-sm text-[#0c0c48]/40"
              aria-hidden="true"
            >
              No image selected
            </div>
          )}
        </div>
        {hasCaption && (
          <figcaption
            className="mt-3 text-center text-sm text-[#0c0c48]/70"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {caption}
          </figcaption>
        )}
      </figure>
    </section>
  );
}
