// Default content for the three collaborations blocks (`collaborationsIntro`,
// `academicCollaborators`, `industryCollaborators`). Shared as the single source
// of truth between the component (render fallback), the registry (defaultContent
// for new blocks + the migration backfill) and the seed (so the seeded page
// renders identically to the old hardcoded copy).
//
// Pure data — safe to import from client, server and scripts.
//
// These values were lifted verbatim from the EN translation dictionary
// (`src/messages/en.ts` → `collaborations`) and the original component JSX, so
// the page is byte-identical after conversion. The native-speaker 中文 from
// `zh.ts` is PRESERVED: prisma/seed-page-blocks.ts pre-seeds it into the
// translation cache (keyed by the EN source text), so publish reuses the human
// translation rather than machine-translating over it.
//
// ─────────────────────────────────────────────────────────────────────────────
// IMAGE WORKFLOW (read this before changing an image) — keep raw paths first-class
// ─────────────────────────────────────────────────────────────────────────────
// Images here are stored as RAW PATHS (e.g. "/Our Team.jpg"). Both raw paths and
// library refs ("media:{id}") are accepted by the renderer/resolver — you never
// have to go through the media-library UI.
//
// To add or replace one of these images IN CODE and keep it tracked/replaceable
// in the media library:
//   1. Set the path here (or in the seed / block content) as a raw path — NOT
//      buried in component JSX (a hardcoded JSX src is invisible to the library).
//   2. Drop the file in `/public`.
//   3. Run `npm run catalog:media` so it gets a MediaAsset row.
// After that the image is picked up by the library's usage scan (`findAssetUsage`)
// and can be replaced/deleted from the admin console like any other asset.

// The "Research Collaborations + Pathway" intro section.
export const COLLABORATIONS_INTRO_DEFAULTS = {
  sectionTitle: "Research Collaborations and Partnerships",
  sectionText:
    "The Human Nutrition Unit encourages research collaborations with industry and academic units, both nationally and internationally.",
  pathwayTitle: "The Research Pathway",
  // The numbered steps (1..N) shown in the blue card; the numbers are rendered
  // by the component, so only the labels live here.
  pathwaySteps: [
    "Early Inception Hypotheses",
    "Protocol Development",
    "Ethical And Regulatory Approval",
    "Completion Of Trials",
    "Data Analysis",
    "Interpretation",
    "Report Writing And Publication",
  ],
  // Raw path — see IMAGE WORKFLOW note above.
  image: "/Our Team.jpg",
  imageAlt: "Research collaboration",
  complianceTitle: "Compliance & Quality Assurance",
  complianceText:
    "The Unit ensures compliance with Good Clinical Practice, up to the level of ICH GCP where required, and has experience of and welcomes independent trial monitoring and audit processes.",
} as const;

// The "Featured Academic Collaborations" section — heading + four featured cards
// + a "view all" button. Cards reuse the StudyCardContent shape so they share the
// existing studyCards field editor and the studyCards translation path. Leaving a
// card's buttonHref blank renders a non-clickable card (the original behaviour).
export const ACADEMIC_COLLABORATORS_DEFAULTS = {
  heading: "Featured Academic Collaborations",
  cards: [
    {
      title: "LactoPharma consortium",
      description: "Dairy bioactives and health",
      // Raw path — see IMAGE WORKFLOW note above.
      imageSrc: "/daniel-quiceno-m-4MQtWCxUrYc-unsplash.jpg",
      imageAlt: "Featured Academic Collaborations",
      imagePosition: "center",
    },
    {
      title: "Marine polysaccharide Chitosan and weight loss",
      description: "Collaboration with the University of Queensland, Australia",
      imageSrc: "/joachim-schnurle-TLEI9o1HdY4-unsplash.jpg",
      imageAlt: "Featured Academic Collaborations",
      imagePosition: "center",
    },
    {
      title: "Omega-3 polyunsaturated fatty acids (fish oils) and stroke",
      description: "Collaboration with the George Institute, Aus",
      imageSrc: "/alex-saks-rCAJjRuTHyE-unsplash.jpg",
      imageAlt: "Featured Academic Collaborations",
      imagePosition: "center",
    },
    {
      title: "Adipokynes in obesity",
      description: "Collaboration with the University of Hong Kong",
      imageSrc: "/siora-photography-cixohzDpNIo-unsplash.jpg",
      imageAlt: "Featured Academic Collaborations",
      imagePosition: "center",
    },
  ],
  buttonLabel: "View all academic partners",
  buttonHref: "/collaborations/academic",
} as const;

// The "Featured Industry Collaborations" section — same shape as academic.
export const INDUSTRY_COLLABORATORS_DEFAULTS = {
  heading: "Featured Industry Collaborations",
  cards: [
    {
      title: "Pharmaceutical",
      description:
        "New therapeutics for treatment of diabetic cardiomyopathy Complete diet balance studies",
      // Raw path — see IMAGE WORKFLOW note above.
      imageSrc: "/roberto-sorin-RS0-h_pyByk-unsplash.jpg",
      imageAlt: "Featured Industry Collaborations",
      imagePosition: "center",
    },
    {
      title: "Food",
      description:
        "Novel butter fat and cardiovascular risk - Dairy lipids & proteins and cholesterol lowering",
      imageSrc: "/lily-banse--YHSwy6uqvk-unsplash.jpg",
      imageAlt: "Featured Industry Collaborations",
      imagePosition: "center",
    },
    {
      title: "Food Ingredients",
      description:
        "Barley ß-glucan Glucagel and cholesterol lowering - Barley ß-glucan Cerogen and glucose control",
      imageSrc: "/dan-gold-4_jhDO54BYg-unsplash.jpg",
      imageAlt: "Featured Industry Collaborations",
      imagePosition: "center",
    },
    {
      title: "Nutraceuticals",
      description:
        "Marine polysaccharide Chitosan and weight loss - Omega-3 polyunsaturated fatty acids (fish oils) and stroke",
      imageSrc: "/towfiqu-barbhuiya-4N0dLUmdLAY-unsplash.jpg",
      imageAlt: "Featured Industry Collaborations",
      imagePosition: "center",
    },
  ],
  buttonLabel: "View all industry partners",
  buttonHref: "/collaborations/industry",
} as const;
