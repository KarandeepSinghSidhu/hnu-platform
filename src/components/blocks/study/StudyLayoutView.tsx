import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StudyLayoutClient, { type StudyLayoutBlock } from "./StudyLayoutClient";
import { toStudyData } from "./resolve-study-layout";
import { parseBlockContent } from "@/lib/blocks/validate";

const FALLBACK_IMAGE = "/services-and-expertise.jpg";

// Trimmed so whitespace-only values fall through to the study defaults (a blank
// image would otherwise feed Next/Image an invalid src).
const asStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

type StudyForView = Parameters<typeof toStudyData>[0] & { imagePath?: string };

// Full study page shell (hero + breadcrumb + custom block layout). Used by every
// study route when an override/template layout is active. A `studyHero` block in
// the layout customises the hero (eyebrow / title / image) and is rendered here
// as the full-width hero rather than in the block flow; without one, the hero
// falls back to the study's own title and image (unchanged behaviour).
export default function StudyLayoutView({
  study,
  blocks,
}: {
  study: StudyForView;
  blocks: StudyLayoutBlock[];
}) {
  const heroBlock = blocks.find((b) => b.type === "studyHero");
  const hero = heroBlock ? parseBlockContent(heroBlock.content) : {};
  const eyebrow = asStr(hero.eyebrow) || "Our Studies";
  const heroTitle = asStr(hero.title) || study.title;
  const heroImage =
    asStr(hero.image) ||
    (study.imagePath?.trim() ? study.imagePath : FALLBACK_IMAGE);
  const contentBlocks = blocks.filter((b) => b.type !== "studyHero");

  return (
    <>
      <Navbar />

      <section
        className="relative w-full overflow-hidden h-[420px] sm:h-[480px] lg:h-[554px]"
        style={{ marginTop: "-180px" }}
        aria-label={`${heroTitle} hero`}
      >
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center center" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 px-6 sm:px-12 lg:px-[45px] pb-10 sm:pb-14">
          <p className="text-white/75 text-xs sm:text-sm font-semibold tracking-[2px] uppercase mb-3">
            {eyebrow}
          </p>
          <h1 className="text-3xl sm:text-5xl lg:text-[64px] font-extrabold text-white leading-tight tracking-[1.2px] max-w-[1100px]">
            {heroTitle}
          </h1>
        </div>
      </section>

      <nav aria-label="Breadcrumb" className="bg-white px-6 sm:px-12 lg:px-[52px] py-5">
        <ol className="flex items-center gap-2 text-[18px] text-[#0c0c48] tracking-[0.36px]">
          <li>
            <Link href="/#studies" className="hover:opacity-70 transition-opacity">
              Studies
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li>
            <span className="font-bold">{study.title}</span>
          </li>
        </ol>
      </nav>

      <main id="main-content" className="bg-white">
        <StudyLayoutClient study={toStudyData(study)} blocks={contentBlocks} />
      </main>

      <Footer />
    </>
  );
}
