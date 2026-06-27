"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// Breadcrumbed grid of partner logos used on the Academic / Industry partner
// pages. Images are editable via the page builder. The two pages differ only in
// minor padding, controlled by `variant`, so both render pixel-identically.
export default function PartnerImageGrid({
  breadcrumbLabel,
  images,
  variant = "academic",
}: {
  breadcrumbLabel: string;
  images: string[];
  variant?: "academic" | "industry";
}) {
  const { t } = useLanguage();
  const containerStyle =
    variant === "academic"
      ? { borderRadius: "30px", border: "1px solid #e5e7eb", padding: "10px" }
      : { borderRadius: "30px", border: "1px solid #e5e7eb" };
  const imageClass =
    variant === "academic" ? "object-contain p-3" : "object-contain p-[10px]";

  return (
    <section className="relative w-full bg-white py-16 px-6 sm:px-12 lg:px-45 overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        {/* Breadcrumbs */}
        <nav className="mb-10 text-[16px] tracking-[0.4px] text-[#0c0c48]">
          <Link href="/" className="hover:underline">
            {t.navbar.home}
          </Link>
          <span className="mx-2">›</span>
          <Link href="/collaborations" className="hover:underline">
            {t.navbar.collaborations}
          </Link>
          <span className="mx-2">›</span>
          <strong>{breadcrumbLabel}</strong>
        </nav>

        {/* Partner grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((src, i) => {
            const alt =
              src
                .split("/")
                .pop()
                ?.replace(/\.[^.]+$/, "")
                .replace(/[-_]/g, " ")
                .trim() || `Partner logo ${i + 1}`;

            return (
              <div
                key={src}
                className="relative w-full aspect-[4/3] bg-white flex items-center justify-center"
                style={containerStyle}
                title={alt}
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
                  className={imageClass}
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
