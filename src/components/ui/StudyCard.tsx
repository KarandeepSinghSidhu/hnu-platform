"use client";

import Image from "next/image";
import Link from "next/link";
import Button from "./Button";

interface StudyCardProps {
  title: string;
  subtitle?: string;
  description: string;
  buttonLabel?: string;
  buttonHref?: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: "center" | "right" | "left" | "top" | "bottom";
}

export default function StudyCard({
  title,
  subtitle,
  description,
  buttonLabel = "Find out more >",
  buttonHref,
  imageSrc,
  imageAlt,
  imagePosition = "center",
}: StudyCardProps) {
  const cardStyle = { boxShadow: "0 0 10px 10px rgba(0,0,0,0.05)" };
  const cardClass = "bg-white rounded-[30px] overflow-hidden flex flex-col transition-all duration-200";
  const hoverHandlers = buttonHref ? {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.outline = "2px solid #0c0c48";
      (e.currentTarget as HTMLElement).style.outlineOffset = "6px";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.outline = "none";
      (e.currentTarget as HTMLElement).style.outlineOffset = "0";
    },
  } : {};

  const content = (
    <>
      <div className="relative w-full h-[180px] sm:h-[280px] flex-shrink-0">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className={`object-cover object-${imagePosition}`}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          // next/image throws on an empty src; show a neutral placeholder so a
          // card without an image yet still renders cleanly instead of crashing.
          <div
            className="flex h-full w-full items-center justify-center bg-[#0c0c48]/5 text-xs text-[#0c0c48]/40"
            aria-hidden="true"
          >
            No image selected
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:gap-4 px-6 py-5 sm:px-[45px] sm:py-8 flex-1">
        <h2
          className="text-[#0c0c48] font-bold"
          style={{ fontSize: "clamp(20px, 5vw, 32px)", lineHeight: 1.2 }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-[#0c0c48] text-[13px] sm:text-[16px]">{subtitle}</p>
        )}
        <p className="text-[#0c0c48] text-[13px] sm:text-[16px] leading-relaxed">
          {description}
        </p>
      </div>
    </>
  );

  if (buttonHref) {
    return (
      <>
        {/* Desktop: entire card is clickable */}
        <Link
          href={buttonHref}
          className={`${cardClass} hover:-translate-y-1 hidden sm:flex`}
          style={cardStyle}
          {...hoverHandlers}
        >
          {content}
        </Link>

        {/* Mobile: plain card with Button at the bottom */}
        <div className={`${cardClass} flex sm:hidden`} style={cardStyle}>
          {content}
          <div className="px-6 pb-6 pt-1">
            <Button href={buttonHref} variant="blue" color="dark" className="w-full">
              {buttonLabel}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={cardClass} style={cardStyle}>
      {content}
    </div>
  );
}