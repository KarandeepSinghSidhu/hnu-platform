import "dotenv/config";
import crypto from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import {
  DISCOVER_VIDEO_DEFAULTS,
  TRIAL_DESIGN_DEFAULTS,
} from "../src/lib/blocks/default-content";
import {
  ACADEMIC_COLLABORATORS_DEFAULTS,
  COLLABORATIONS_INTRO_DEFAULTS,
  INDUSTRY_COLLABORATORS_DEFAULTS,
} from "../src/lib/blocks/collaborations-content";
import { snapshotBlocks } from "../src/lib/page-publish";
import enMessages from "../src/messages/en";
import zhMessages from "../src/messages/zh";

// Seeds the page-builder tables (Page + PageBlock) with the content that was
// previously hardcoded in each page's JSX. Running this reproduces the exact
// current site layout from the database.
//
// Idempotent: by default it skips pages that already have blocks (so admin edits
// are preserved). Set RESEED_PAGES=1 to delete and recreate every page's blocks.

type BlockSeed = { type: string; content: Record<string, unknown> };
type PageSeed = { slug: string; title: string; blocks: BlockSeed[] };

const PAGE_SEEDS: PageSeed[] = [
  {
    slug: "home",
    title: "Home",
    blocks: [
      {
        type: "homepageHero",
        content: {
          title: "Unlock the power of food with \n the Human Nutrition Unit",
          buttonLabel: "JOIN A STUDY",
          buttonHref: "/contact",
          backgroundGradient:
            "linear-gradient(112deg, #0f2e75 0%, #0b4e93 48%, #0a95ca 100%)",
          heroImageSrc: "/images/homepage-hero-bowl.webp",
        },
      },
      {
        type: "updates",
        content: {
          updates: [
            {
              title: "NZ Synergy Study Now Recruiting",
              date: "May 2026",
              paragraphs: [
                "We are now actively recruiting participants for our NZ Synergy residential nutrition study.",
                "If you are aged 18–60 with elevated fasting blood sugar and a BMI of 24–40, you may be eligible.",
              ],
            },
            {
              title: "New Publication Released",
              date: "April 2026",
              paragraphs: [
                "Our team has published new findings on feijoa whole fruit powder and type 2 diabetes risk markers.",
              ],
            },
          ],
        },
      },
      {
        type: "sectionHeading",
        content: { text: "Check out our current studies!", heightClass: "h-40" },
      },
      {
        type: "homepageStudies",
        content: {
          cards: [
            {
              title: "NZ Synergy",
              subtitle: "A Two-Week Nutrition Study for Diabetes Prevention",
              description:
                "We will investigate whether the foods you eat alter blood markers associated with the risk of developing type 2 diabetes.",
              buttonHref: "/studies/nz-synergy",
              buttonLabel: "Find out more >",
              imageSrc: "/NZ Synergy Study.jpg",
              imageAlt: "NZ Synergy Study",
              imagePosition: "center",
            },
            {
              title: "NZ Food and Beverage",
              subtitle: "A Weight Loss Study for Diabetes Prevention",
              description:
                "We will investigate whether daily consumption of feijoa whole fruit powder alters risk of developing type 2 diabetes.",
              buttonHref: "/studies/food-beverage",
              buttonLabel: "Find out more >",
              imageSrc: "/nz-food-beverage-study.jpg",
              imageAlt: "NZ Food and Beverage Study",
              imagePosition: "center",
            },
          ],
        },
      },
      {
        type: "infoCardLeft",
        content: {
          title: "About Us",
          imagePosition: "right",
          cardBg: "standard",
          showButton: true,
          body:
            "<p>HNU is a nutrition research facility within The University of Auckland, New Zealand's most prestigious and largest University.</p><p>The Unit undertakes research to establish links between diet, health and disease prevention.</p>",
          buttonLabel: "More Information",
          buttonHref: "/about",
          imageSrc: "/1630363804706 (1).jpg",
          imageAlt: "HNU team member standing by blue railings",
        },
      },
      {
        type: "infoCardRight",
        content: {
          title: "Our Research",
          imagePosition: "left",
          cardBg: "light",
          showButton: true,
          body:
            "<p>We investigate the effects of whole foods, food components, bioactives and nutraceutical products on health and disease.</p><p>Our research focuses on key areas of human nutrition: obesity, appetite regulation, metabolic syndrome, cardiovascular risk, pre-diabetes and type 2 diabetes.</p>",
          buttonLabel: "Read More →",
          buttonHref: "/research",
          imageSrc: "/services-and-expertise.jpg",
          imageAlt: "HNU research being conducted in the clinical room",
        },
      },
      {
        type: "sectionHeading",
        content: { text: "Our partners", heightClass: "h-32" },
      },
      { type: "ourPartners", content: {} },
    ],
  },
  {
    slug: "about",
    title: "Discover HNU (About)",
    blocks: [
      {
        type: "discoverHero",
        content: {
          title: "Discover HNU",
          subtitle:
            "Focused on better health through nutrition.\nLearn more about our work and purpose",
          subtitleMaxWidth: "697",
        },
      },
      { type: "discoverVideo", content: { ...DISCOVER_VIDEO_DEFAULTS } },
      {
        type: "calloutBannerRight",
        content: {
          leftTitle: "Collaborate With Us",
          leftDescription:
            "Partner with New Zealand's leading nutrition research facility. We work with academic institutions, industry leaders, and government agencies to advance nutrition science.",
          title: "Let's work together",
          description:
            "Whether you're looking to fund research, co-develop a study, or explore industry partnerships — we'd love to hear from you.",
          buttonLabel: "Get in touch →",
          buttonHref: "/contact",
          showButton: true,
        },
      },
      {
        type: "infoCardLeft",
        content: {
          title: "Services & Expertise",
          imagePosition: "left",
          cardBg: "dark",
          showButton: false,
          body:
            "<p>The Human Nutrition Unit provides a comprehensive range of services across both academic and commercially funded research. These include consultancy on nutrition regulatory issues and health claims, trial design and protocol development, participant recruitment and screening, and full trial management and coordination. The team also delivers data collection, analysis, interpretation, and the publication of peer-reviewed scientific research.</p>",
          buttonLabel: "Learn More",
          buttonHref: "/research",
          imageSrc: "/NZ Synergy Study.jpg",
          imageAlt: "Healthy food on a table",
        },
      },
      { type: "recentPublications", content: {} },
      {
        type: "infoCardRight",
        content: {
          title: "Capabilities",
          imagePosition: "right",
          cardBg: "light",
          showButton: false,
          body:
            "<p>The Unit is equipped to deliver highly controlled and precise nutrition research. Capabilities include controlled diet provision, energy expenditure measurement, anthropometric assessments such as body composition analysis, and clinical procedures including phlebotomy and venous cannulation.</p><p>Additional services include urine and faecal sample collection, with external nursing support available for overnight studies when required.</p>",
          imageSrc: "/Our Research.jpg",
          imageAlt: "Modern research laboratory",
        },
      },
      {
        type: "calloutBannerRight",
        content: {
          leftTitle: "Trial Design",
          leftDescription:
            "The Human Nutrition Unit conducts rigorously controlled nutrition intervention trials exploring the relationship between diet, health, and disease outcomes. Studies include randomised, placebo-controlled, single and double-blind designs using both cross-over and parallel methodologies to ensure reliable scientific results. All research follows strict human ethics procedures and Good Clinical Practice (GCP) standards, with approvals from Human Ethics Committees, SCOTT, and MedSafe where required.",
          title: "Residential & Community Studies",
          description:
            "Research ranges from single-day clinical visits to fully controlled residential studies lasting up to four weeks, where participants follow carefully managed dietary programmes within the Unit’s facilities. Longer-term community trials allow participants to continue daily life while attending scheduled clinic visits for assessments and dietary interventions. These flexible study models provide highly accurate nutritional research while supporting strong participant compliance and scientifically robust outcomes.",
        },
      },
      {
        type: "infoCardLeft",
        content: {
          title: "Facilities",
          imagePosition: "left",
          cardBg: "dark",
          showButton: false,
          body:
            "<p>HNU offers a purpose-built research environment designed to support controlled human nutrition studies.</p><p>Facilities include a clinical room for blood collection, an indirect calorimetry room for measuring energy expenditure, an interview lounge, and a biological sample handling laboratory.</p><p>The Unit also features a metabolic kitchen and five fully furnished residential bedrooms, along with bathroom facilities, enabling both short- and long-term live-in studies.</p>",
          buttonLabel: "Explore Our Facilities",
          buttonHref: "/facilities",
          imageSrc: "/facilities.png",
          imageAlt: "Interior of the Human Nutrition Unit facilities",
        },
      },
      {
        type: "calloutBannerRight",
        content: {
          title: "Visit Us",
          description:
            "Visit us or get in touch to learn more about our facilities and research. The Human Nutrition Unit is based at the University of Auckland, and we welcome enquiries from researchers, industry partners, and participants interested in our studies.",
          leftDescription: " ",
          buttonLabel: "Find us and get in contact →",
          buttonHref: "/contact",
          showButton: true,
        },
      },
    ],
  },
  {
    slug: "studies",
    title: "Our Studies",
    blocks: [
      { type: "studiesHero", content: {} },
      { type: "studiesOverview", content: {} },
      { type: "trialDesign", content: { ...TRIAL_DESIGN_DEFAULTS } },
    ],
  },
  {
    slug: "research",
    title: "Our Research",
    blocks: [
      {
        type: "researchHero",
        content: {
          title: "Our Research",
          subtitle:
            "Better health through nutrition science.\nExplore our research in diet, disease, and clinical trials",
          subtitleMaxWidth: "626",
        },
      },
      { type: "publicationIndex", content: {} },
    ],
  },
  {
    slug: "team",
    title: "Our Team",
    blocks: [
      {
        type: "teamHero",
        content: {
          title: "Our Team",
          subtitle:
            "We're passionate about what we do.\nFind out more about the people behind\nthe Human Nutrition Unit",
          subtitleMaxWidth: "",
        },
      },
      { type: "teamSections", content: {} },
    ],
  },
  {
    slug: "collaborations",
    title: "Collaborations",
    blocks: [
      {
        type: "subpageHero",
        content: {
          title: "Our Collaborations",
          subtitle:
            "Building partnerships in nutrition research.\n Learn more about our collaborative\n work and initiatives.",
          subtitleMaxWidth: "",
        },
      },
      // Seeded with the original copy + image paths so the page renders
      // identically after these blocks became editable. Images are raw paths
      // (see src/lib/blocks/collaborations-content.ts for the catalog workflow).
      { type: "collaborationsIntro", content: { ...COLLABORATIONS_INTRO_DEFAULTS } },
      { type: "academicCollaborators", content: { ...ACADEMIC_COLLABORATORS_DEFAULTS } },
      { type: "benefitsRow", content: { variant: "academic", title: "" } },
      { type: "industryCollaborators", content: { ...INDUSTRY_COLLABORATORS_DEFAULTS } },
      { type: "benefitsRow", content: { variant: "industry", title: "" } },
      {
        type: "calloutBannerRight",
        content: {
          leftTitle: "Collaborate With Us",
          leftDescription:
            "Partner with New Zealand's leading nutrition research facility. We work with academic institutions, industry leaders, and government agencies to advance nutrition science.",
          title: "Let's work together",
          description:
            "Whether you're looking to fund research, co-develop a study, or explore industry partnerships — we'd love to hear from you.",
          buttonLabel: "Get in touch",
          buttonHref: "/contact",
          showButton: true,
        },
      },
      {
        type: "infoCardLeft",
        content: {
          title: "About Us",
          imagePosition: "right",
          cardBg: "standard",
          showButton: true,
          body:
            "<p>HNU is a nutrition research facility within The University of Auckland, New Zealand's most prestigious and largest University.</p><p>The Unit undertakes research to establish links between diet, health and disease prevention.</p>",
          buttonLabel: "More Information",
          buttonHref: "/about",
          imageSrc: "/1630363804706 (1).jpg",
          imageAlt: "HNU team member standing by blue railings",
        },
      },
    ],
  },
  {
    slug: "collaborations-academic",
    title: "Academic Partners",
    blocks: [
      {
        type: "subpageHero",
        content: {
          title: "Academic Partners",
          subtitle:
            "Research collaborations and partnerships with industry and academic units, nationally and internationally.",
          subtitleMaxWidth: "657",
        },
      },
      {
        type: "partnerImageGrid",
        content: {
          breadcrumbLabel: "Academic Partners",
          variant: "academic",
          images: [
            "/images/partners/Logo_MU_Sofia.png",
            "/images/partners/logo_UCA_Long_300dpi.png",
            "/images/partners/Maastricht-University.png",
            "/images/partners/Massey-ui-logo-profile.jpg",
            "/images/partners/newcastle_university_logo.png.webp",
            "/images/partners/the-university-of-nottingham-1-logo-png-transparent.png",
            "/images/partners/the-university-of-sydney-vector-logo.png",
            "/images/partners/uni-of-lisbon-logo.x96648cc0.png",
            "/images/partners/UNIVERSIDAD DE NAVARRA.jpg",
            "/images/partners/university-of-copenhagen.png",
            "/images/partners/university-of-otago-logo-profile.jpg",
            "/images/partners/UUPK9a0CDH8lm8lC8asT7SJsUF23FSkGxVNY94uP.png",
          ],
        },
      },
    ],
  },
  {
    slug: "collaborations-industry",
    title: "Industry Partners",
    blocks: [
      {
        type: "subpageHero",
        content: {
          title: "Industry Partners",
          subtitle:
            "Research collaborations and partnerships with industry and academic units, nationally and internationally.",
          subtitleMaxWidth: "657",
        },
      },
      {
        type: "partnerImageGrid",
        content: {
          breadcrumbLabel: "Industry Partners",
          variant: "industry",
          images: [
            "/images/partners/1722396919-ocs_art_37_the_great_kiwi_earthworm_survey_agresearch_logo-colour.jpg",
            "/images/partners/HPSNZ-Black-Horizontal.jpg",
            "/images/partners/Logo_astar_sifbi-e1619082277983.png",
            "/images/partners/logo_wageningen.png",
            "/images/partners/Nzdf-logo.png",
            "/images/partners/PFR-print.jpg",
            "/images/partners/Riddet_MaoriLogo_Stacked_CMYK_2019-d22aacda.jpeg",
          ],
        },
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact Us",
    blocks: [
      {
        type: "contactHero",
        content: {
          title: "Contact Us",
          subtitle: "Have a question or enquiry?\nGet in touch with our team",
          subtitleMaxWidth: "",
        },
      },
    ],
  },
];

/**
 * Seeds every page in PAGE_SEEDS: upserts the Page, backfills an "Original"
 * revision (so the as-designed layout is always revertable from History), then
 * creates its PageBlocks and publishes them. Idempotent — pages that already
 * have blocks are skipped to preserve admin edits unless `force` is set, which
 * deletes and recreates them. Also pre-seeds the manual ZH translation cache.
 */
export async function seedPageBlocks(prisma: PrismaClient, force = false) {
  for (const pageSeed of PAGE_SEEDS) {
    const page = await prisma.page.upsert({
      where: { slug: pageSeed.slug },
      update: { title: pageSeed.title },
      create: { slug: pageSeed.slug, title: pageSeed.title },
    });

    // Canonical snapshot of this page's as-designed default layout.
    const seedSnapshot = snapshotBlocks(
      pageSeed.blocks.map((b) => ({
        type: b.type,
        content: JSON.stringify(b.content),
        isVisible: true,
      })),
    );

    // Preserve the default as an "Original" revision so a page can always be
    // reverted to its original layout from History — even after it's been edited
    // and republished. Idempotent, and created for existing pages too (it runs
    // before the block-seeding skip below), so re-running the seed backfills
    // pages that were seeded before this baseline existed.
    const hasOriginal = await prisma.pageRevision.count({
      where: { pageId: page.id, label: "Original" },
    });
    if (hasOriginal === 0) {
      await prisma.pageRevision.create({
        data: {
          pageId: page.id,
          content: seedSnapshot,
          label: "Original",
          // Backdate to the page's creation so it always sorts oldest in History.
          createdAt: page.createdAt,
        },
      });
    }

    const existing = await prisma.pageBlock.count({
      where: { pageId: page.id },
    });

    if (existing > 0 && !force) {
      console.log(
        `• ${pageSeed.slug}: ${existing} blocks already present — skipping`,
      );
      continue;
    }

    if (existing > 0) {
      await prisma.pageBlock.deleteMany({ where: { pageId: page.id } });
    }

    for (let i = 0; i < pageSeed.blocks.length; i++) {
      const block = pageSeed.blocks[i];
      await prisma.pageBlock.create({
        data: {
          pageId: page.id,
          type: block.type,
          content: JSON.stringify(block.content),
          position: i,
          isVisible: true,
        },
      });
    }

    // Publish the seeded content so the public site renders it immediately and
    // the editor shows the page as published (not "unpublished changes").
    await prisma.page.update({
      where: { id: page.id },
      data: { publishedContent: seedSnapshot, publishedAt: new Date() },
    });

    console.log(`✓ ${pageSeed.slug}: seeded ${pageSeed.blocks.length} blocks`);
  }

  await seedCollaborationTranslations(prisma);
}

const sha256 = (text: string): string =>
  crypto.createHash("sha256").update(text).digest("hex");

// Pre-seed the native-speaker Chinese for the collaborations copy into the
// translation cache so publishing never machine-translates over it. The
// collaborations sections were converted to editable blocks whose EN content is
// seeded verbatim from `src/lib/blocks/collaborations-content.ts` (identical to
// `en.collaborations`); without this, the first publish would replace the
// hand-written 中文 (authored by native speakers in `zh.ts`) with machine output.
//
// How it survives: `warmTranslations` only fills MISSING cache keys, and the
// render path prefers the cache over local fallbacks — so a pre-seeded row is a
// cache hit that publish leaves untouched and render uses. Keys are
// `sha256(EN source)` + format "text", matching `src/lib/translate/blocks.ts`.
// Idempotent (upsert). If an admin later edits a block's EN text, its hash no
// longer matches and that new text is machine-translated as normal.
async function seedCollaborationTranslations(prisma: PrismaClient) {
  const en = enMessages.collaborations as Record<string, string>;
  const zh = zhMessages.collaborations as Record<string, string>;

  // Strings that appear in block content but not in the dictionary.
  const pairs: Array<[string, string]> = [
    ["Research collaboration", "研究合作"], // collaborationsIntro image alt
  ];
  for (const [key, enText] of Object.entries(en)) {
    const zhText = zh[key];
    if (
      typeof enText === "string" &&
      enText.trim() &&
      typeof zhText === "string" &&
      zhText.trim()
    ) {
      pairs.push([enText, zhText]);
    }
  }

  let count = 0;
  for (const [sourceText, translatedText] of pairs) {
    const sourceHash = sha256(sourceText);
    await prisma.translationCache.upsert({
      where: {
        targetLang_format_sourceHash: {
          targetLang: "ZH",
          format: "text",
          sourceHash,
        },
      },
      update: { sourceText, translatedText, provider: "manual-zh-seed" },
      create: {
        targetLang: "ZH",
        format: "text",
        sourceHash,
        sourceText,
        translatedText,
        provider: "manual-zh-seed",
      },
    });
    count += 1;
  }
  console.log(
    `✓ collaboration translations: ensured ${count} manual ZH cache entries`,
  );
}

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./dev.db",
  });
  const prisma = new PrismaClient({ adapter });
  const force = process.env.RESEED_PAGES === "1";
  try {
    await seedPageBlocks(prisma, force);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run standalone when invoked directly (e.g. `tsx prisma/seed-page-blocks.ts`),
// not when imported by prisma/seed.ts.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
