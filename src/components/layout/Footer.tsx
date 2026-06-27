"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { NewTabHint } from "@/components/ui/NewTabHint";

export default function Footer() {
  const { t } = useLanguage();

  const legalLinks = [
    {
      href: "https://www.auckland.ac.nz",
      label: t.footer.university,
    },
    {
      href: "https://www.auckland.ac.nz/en/about/the-university/accessibility.html",
      label: t.footer.accessibility,
    },
    {
      href: "https://www.uniservices.co.nz",
      label: t.footer.copyrightByUniservices,
    },
    {
      href: "https://www.auckland.ac.nz/en/privacy.html",
      label: t.footer.privacy,
    },
    {
      href: "https://www.auckland.ac.nz/en/about/the-university/disclaimer.html",
      label: t.footer.disclaimer,
    },
  ];

  return (
    <footer className="bg-black text-white mt-auto">
      <div className="max-w-7xl mx-auto py-10 px-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          {/* Left */}
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            © HNU Auckland 2026. All rights reserved.
          </p>

          {/* Right */}
          <ul className="flex flex-wrap justify-center lg:justify-end items-center gap-y-1 text-sm tracking-wide text-white/70">
            {legalLinks.map((link, i) => (
              <li key={link.href} className="flex items-center">
                {i > 0 && <span className="mx-3 text-white/30">|</span>}

                <a
                  href={link.href}
                  className="hover:text-white hover:underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                  <NewTabHint />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
