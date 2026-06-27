// The single source of truth for block metadata: labels, categories, editor
// fields and default content. Pure data — safe to import from both client and
// server. Actual rendering lives in src/components/blocks/BlockRenderer.tsx,
// which maps each `type` to a React component.

import type { BlockDefinition, BlockField } from "./types";
import {
  DISCOVER_VIDEO_DEFAULTS,
  TRIAL_DESIGN_DEFAULTS,
} from "./default-content";
import {
  ACADEMIC_COLLABORATORS_DEFAULTS,
  COLLABORATIONS_INTRO_DEFAULTS,
  INDUSTRY_COLLABORATORS_DEFAULTS,
} from "./collaborations-content";

const IMAGE_POSITION_OPTIONS = [
  "center",
  "right",
  "left",
  "top",
  "bottom",
] as const;

const CARD_BG_OPTIONS = ["dark", "standard", "light"] as const;

const INFO_CARD_FIELDS: readonly BlockField[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "body", label: "Body", type: "richText" },
  { key: "imageSrc", label: "Image", type: "image" },
  { key: "imageAlt", label: "Image alt text", type: "text" },
  {
    key: "imagePosition",
    label: "Image position",
    type: "enum",
    options: IMAGE_POSITION_OPTIONS,
  },
  {
    key: "cardBg",
    label: "Card background",
    type: "enum",
    options: CARD_BG_OPTIONS,
  },
  { key: "showButton", label: "Show button", type: "boolean" },
  { key: "buttonLabel", label: "Button label", type: "text" },
  { key: "buttonHref", label: "Button link", type: "url" },
];

const INFO_CARD_DEFAULT = {
  title: "New section",
  body: "<p>Add your content here.</p>",
  imageSrc: "",
  imageAlt: "",
  imagePosition: "center",
  cardBg: "standard",
  showButton: false,
  buttonLabel: "More Information",
  buttonHref: "#",
};

const CALLOUT_COMMON_FIELDS: readonly BlockField[] = [
  { key: "title", label: "Card title", type: "text" },
  { key: "description", label: "Card description", type: "richText" },
  { key: "showButton", label: "Show button", type: "boolean" },
  { key: "buttonLabel", label: "Button label", type: "text" },
  { key: "buttonHref", label: "Button link", type: "url" },
  { key: "backgroundImage", label: "Background image", type: "image" },
  { key: "backgroundColor", label: "Background colour / gradient", type: "text" },
];

// Shared by the subpage-style heroes (a title + line-broken subtitle over an
// image). Used by `subpageHero` and the page-specific hero blocks.
const SUBPAGE_HERO_FIELDS: readonly BlockField[] = [
  { key: "title", label: "Title", type: "text" },
  {
    key: "subtitle",
    label: "Subtitle",
    type: "textarea",
    help: "Each new line becomes a line break.",
  },
  {
    key: "subtitleMaxWidth",
    label: "Subtitle max width (px)",
    type: "text",
    help: "Optional. Leave blank for full width.",
  },
];

// The two "Featured collaborations" blocks (academic + industry) share an
// identical shape: a heading, four featured cards, and a "view all" button. The
// cards reuse the `studyCards` field type so they get the existing card editor
// and the studyCards translation path for free.
const FEATURED_COLLABORATORS_FIELDS: readonly BlockField[] = [
  { key: "heading", label: "Section heading", type: "text" },
  { key: "cards", label: "Featured cards", type: "studyCards" },
  { key: "buttonLabel", label: "Button label", type: "text" },
  { key: "buttonHref", label: "Button link", type: "url" },
];

const DEFINITIONS: BlockDefinition[] = [
  // ---- Heroes ----
  {
    type: "homepageHero",
    label: "Homepage hero",
    category: "Hero",
    editable: true,
    hidden: true,
    fields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        help: "Each new line becomes a line break.",
      },
      { key: "buttonLabel", label: "Button label", type: "text" },
      { key: "buttonHref", label: "Button link", type: "url" },
      {
        key: "backgroundGradient",
        label: "Background gradient (CSS)",
        type: "text",
      },
      { key: "heroImageSrc", label: "Hero image", type: "image" },
    ],
    defaultContent: {
      title: "Unlock the power of food with \n the Human Nutrition Unit",
      buttonLabel: "JOIN A STUDY",
      buttonHref: "/#studies",
      backgroundGradient:
        "linear-gradient(112deg, #0f2e75 0%, #0b4e93 48%, #0a95ca 100%)",
      heroImageSrc: "/images/homepage-hero-bowl.webp",
    },
  },
  {
    type: "discoverHero",
    label: "Discover hero",
    category: "Hero",
    editable: true,
    hidden: true,
    fields: SUBPAGE_HERO_FIELDS,
    defaultContent: {
      title: "Discover HNU",
      subtitle:
        "Focused on better health through nutrition.\nLearn more about our work and purpose",
      subtitleMaxWidth: "697",
    },
  },
  {
    type: "researchHero",
    label: "Research hero",
    category: "Hero",
    editable: true,
    hidden: true,
    fields: SUBPAGE_HERO_FIELDS,
    defaultContent: {
      title: "Our Research",
      subtitle:
        "Better health through nutrition science.\nExplore our research in diet, disease, and clinical trials",
      subtitleMaxWidth: "626",
    },
  },
  {
    type: "teamHero",
    label: "Team hero",
    category: "Hero",
    editable: true,
    hidden: true,
    fields: SUBPAGE_HERO_FIELDS,
    defaultContent: {
      title: "Our Team",
      subtitle:
        "We're passionate about what we do.\nFind out more about the people behind\nthe Human Nutrition Unit",
      subtitleMaxWidth: "",
    },
  },
  {
    type: "contactHero",
    label: "Contact hero",
    category: "Hero",
    editable: true,
    hidden: true,
    fields: SUBPAGE_HERO_FIELDS,
    defaultContent: {
      title: "Contact Us",
      subtitle: "Have a question or enquiry?\nGet in touch with our team",
      subtitleMaxWidth: "",
    },
  },
  {
    type: "studiesHero",
    label: "Studies hero",
    category: "Hero",
    editable: false,
    hidden: true,
    fields: [],
    defaultContent: {},
  },
  {
    type: "subpageHero",
    label: "Blank hero",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "subtitle",
        label: "Subtitle",
        type: "textarea",
        help: "Each new line becomes a line break.",
      },
      {
        key: "subtitleMaxWidth",
        label: "Subtitle max width (px)",
        type: "text",
        help: "Optional. Leave blank for full width.",
      },
    ],
    defaultContent: { title: "Page title", subtitle: "", subtitleMaxWidth: "" },
  },

  // ---- Generic blocks (content-neutral building blocks) ----
  // Page-scoped: each is wired only into the page BlockRenderer. Do NOT set
  // scope "both" unless the block is also handled by the study StudyBlockRenderer,
  // or it would appear in the study-layout picker and render as nothing.
  {
    type: "prose",
    label: "Text / prose",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "heading", label: "Heading (optional)", type: "text" },
      { key: "body", label: "Body", type: "richText" },
      {
        key: "align",
        label: "Text alignment",
        type: "enum",
        options: ["left", "center"],
      },
    ],
    defaultContent: {
      heading: "",
      body: "<p>Add your text here.</p>",
      align: "left",
    },
  },
  {
    type: "imageBlock",
    label: "Image",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "imageSrc", label: "Image", type: "image" },
      {
        key: "imageAlt",
        label: "Image alt text",
        type: "text",
        help: "Describe the image for screen readers. Leave blank only if purely decorative.",
      },
      { key: "caption", label: "Caption (optional)", type: "text" },
      {
        key: "height",
        label: "Height",
        type: "enum",
        options: ["small", "medium", "large"],
        help: "small ≈ 240px, medium ≈ 400px, large ≈ 560px.",
      },
      { key: "rounded", label: "Rounded corners", type: "boolean" },
    ],
    defaultContent: {
      imageSrc: "",
      imageAlt: "",
      caption: "",
      height: "medium",
      rounded: true,
    },
  },
  {
    type: "videoEmbed",
    label: "Video",
    category: "Generic blocks",
    editable: true,
    fields: [
      {
        key: "videoId",
        label: "YouTube video ID or URL",
        type: "text",
        help: "Paste a YouTube link or just the id (the part after watch?v= or youtu.be/).",
      },
      { key: "heading", label: "Heading (optional)", type: "text" },
      { key: "caption", label: "Caption (optional)", type: "text" },
    ],
    defaultContent: { videoId: "", heading: "", caption: "" },
  },
  {
    type: "accordion",
    label: "Accordion / FAQ",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "heading", label: "Heading (optional)", type: "text" },
      { key: "items", label: "Questions", type: "faqList" },
    ],
    defaultContent: {
      heading: "Frequently asked questions",
      items: [{ question: "Your question here?", answer: "Your answer here." }],
    },
  },
  {
    type: "quote",
    label: "Quote / testimonial",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "attribution", label: "Attribution (name)", type: "text" },
      { key: "role", label: "Role / title (optional)", type: "text" },
    ],
    defaultContent: {
      quote: "Add a memorable quote or testimonial here.",
      attribution: "",
      role: "",
    },
  },
  {
    type: "statHighlights",
    label: "Stat highlights",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "heading", label: "Heading (optional)", type: "text" },
      { key: "items", label: "Stats", type: "statList" },
    ],
    defaultContent: {
      heading: "",
      items: [
        { value: "100+", label: "Label" },
        { value: "20", label: "Label" },
      ],
    },
  },
  {
    // Reuses the Updates carousel component with neutral default content.
    type: "announcements",
    label: "Announcements carousel",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "updates", label: "Announcements", type: "updatesList" },
      {
        key: "backgroundColor",
        label: "Background colour / gradient",
        type: "text",
        help: "Any CSS background (e.g. #114488 or a linear-gradient). Leave empty for the default dark navy. Text and arrows stay white, so keep it dark.",
      },
    ],
    defaultContent: {
      backgroundColor: "",
      updates: [
        {
          title: "Announcement title",
          date: "",
          paragraphs: ["Add your announcement text here."],
        },
      ],
    },
  },
  {
    // Generic, reusable card grid. Reuses HomepageStudiesBlock but WITHOUT the
    // `#studies` anchor (see homepageStudies), so it can be added anywhere, any
    // number of times, without emitting a duplicate/misplaced id.
    type: "cardGrid",
    label: "Card grid",
    category: "Generic blocks",
    editable: true,
    fields: [{ key: "cards", label: "Cards", type: "studyCards" }],
    defaultContent: {
      cards: [
        {
          title: "Card title",
          subtitle: "",
          description: "Short description goes here.",
          buttonLabel: "Find out more >",
          buttonHref: "#",
          imageSrc: "",
          imageAlt: "",
          imagePosition: "center",
        },
      ],
    },
  },
  {
    type: "spacer",
    label: "Spacer / divider",
    category: "Generic blocks",
    editable: true,
    fields: [
      {
        key: "size",
        label: "Vertical space",
        type: "enum",
        options: ["small", "medium", "large"],
      },
      { key: "divider", label: "Show divider line", type: "boolean" },
    ],
    defaultContent: { size: "medium", divider: false },
  },

  // ---- Content ----
  // NOTE: the InfoCardLeft/InfoCardRight components' desktop layouts are
  // historically swapped — the `infoCardLeft` type renders the image on the
  // RIGHT and `infoCardRight` renders it on the LEFT. The labels (and the
  // default image crop) below match what actually renders, so the picker is
  // truthful; the internal type names are kept as-is to avoid migrating the
  // existing stored blocks across draft/published/revision snapshots.
  {
    type: "infoCardLeft",
    label: "Info card (image right)",
    category: "Generic blocks",
    editable: true,
    fields: INFO_CARD_FIELDS,
    defaultContent: { ...INFO_CARD_DEFAULT, imagePosition: "right" },
  },
  {
    type: "infoCardRight",
    label: "Info card (image left)",
    category: "Generic blocks",
    editable: true,
    fields: INFO_CARD_FIELDS,
    defaultContent: { ...INFO_CARD_DEFAULT, imagePosition: "left" },
  },
  {
    type: "calloutBannerRight",
    label: "Callout banner (card right)",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "leftTitle", label: "Left title", type: "text" },
      { key: "leftDescription", label: "Left description", type: "textarea" },
      ...CALLOUT_COMMON_FIELDS,
    ],
    defaultContent: {
      leftTitle: "",
      leftDescription: "",
      title: "Heading",
      description: "Description text.",
      showButton: false,
      buttonLabel: "Find out more",
      buttonHref: "#",
      backgroundImage: "",
      backgroundColor: "",
    },
  },
  {
    type: "calloutBannerLeft",
    label: "Callout banner (card left)",
    category: "Generic blocks",
    editable: true,
    fields: [
      { key: "rightTitle", label: "Right title", type: "text" },
      { key: "rightDescription", label: "Right description", type: "textarea" },
      ...CALLOUT_COMMON_FIELDS,
    ],
    defaultContent: {
      rightTitle: "",
      rightDescription: "",
      title: "Heading",
      description: "Description text.",
      showButton: false,
      buttonLabel: "Find out more",
      buttonHref: "#",
      backgroundImage: "",
      backgroundColor: "",
    },
  },
  {
    // The homepage's studies grid. It carries the singular `#studies` scroll
    // anchor (see HomepageStudiesBlock), so it is NOT a reusable building block:
    // hidden from the picker (the renderer stays for the existing homepage block)
    // and superseded for new use by the anchor-free, generic "Card grid" below.
    type: "homepageStudies",
    label: "Study cards row",
    category: "Content",
    editable: true,
    hidden: true,
    fields: [{ key: "cards", label: "Study cards", type: "studyCards" }],
    defaultContent: {
      cards: [
        {
          title: "Study title",
          subtitle: "",
          description: "Short description of the study.",
          buttonLabel: "Find out more >",
          buttonHref: "/#studies",
          imageSrc: "",
          imageAlt: "",
          imagePosition: "center",
        },
      ],
    },
  },
  {
    type: "updates",
    label: "Updates carousel",
    category: "Content",
    editable: true,
    fields: [
      { key: "updates", label: "Updates", type: "updatesList" },
      {
        key: "backgroundColor",
        label: "Background colour / gradient",
        type: "text",
        help: "Any CSS background (e.g. #114488 or a linear-gradient). Leave empty for the default dark navy. Text and arrows stay white, so keep it dark.",
      },
    ],
    defaultContent: {
      backgroundColor: "",
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
    label: "Section heading",
    category: "Generic blocks",
    scope: "both",
    editable: true,
    fields: [
      { key: "text", label: "Heading text", type: "text" },
      {
        key: "heightClass",
        label: "Vertical space",
        type: "enum",
        options: ["h-32", "h-80"],
        help: "h-32 = compact, h-80 = tall.",
      },
    ],
    defaultContent: { text: "Heading", heightClass: "h-32" },
  },
  {
    type: "collaborationsIntro",
    label: "Collaborations intro",
    category: "Content",
    editable: true,
    fields: [
      { key: "sectionTitle", label: "Section title", type: "text" },
      { key: "sectionText", label: "Section text", type: "textarea" },
      { key: "pathwayTitle", label: "Research pathway title", type: "text" },
      {
        key: "pathwaySteps",
        label: "Research pathway steps",
        type: "paragraphArray",
        help: "Each step is numbered automatically in order.",
      },
      // Raw paths are first-class here. To swap this image in code and keep it
      // library-managed: set a raw path (here or in block content), drop the
      // file in /public, then run `npm run catalog:media`. See
      // src/lib/blocks/collaborations-content.ts for the full workflow note.
      { key: "image", label: "Image", type: "image" },
      { key: "imageAlt", label: "Image alt text", type: "text" },
      { key: "complianceTitle", label: "Compliance card title", type: "text" },
      { key: "complianceText", label: "Compliance card text", type: "textarea" },
    ],
    defaultContent: { ...COLLABORATIONS_INTRO_DEFAULTS },
  },
  {
    type: "partnerImageGrid",
    label: "Partner logo grid",
    category: "Content",
    editable: true,
    hidden: true,
    fields: [
      { key: "breadcrumbLabel", label: "Breadcrumb label", type: "text" },
      { key: "images", label: "Logos", type: "imageArray" },
    ],
    defaultContent: { breadcrumbLabel: "Partners", images: [], variant: "academic" },
  },
  {
    // Dynamic: renders the live list of active studies (getStudies), so it
    // belongs with the other live-data blocks.
    type: "studiesOverview",
    label: "Studies overview",
    category: "Dynamic",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "trialDesign",
    label: "Trial design",
    category: "Content",
    editable: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "intro", label: "Intro", type: "richText" },
      { key: "residentialHeading", label: "Residential heading", type: "text" },
      { key: "residentialBody", label: "Residential body", type: "richText" },
      { key: "communityHeading", label: "Community heading", type: "text" },
      { key: "communityBody", label: "Community body", type: "richText" },
    ],
    defaultContent: { ...TRIAL_DESIGN_DEFAULTS },
  },
  {
    type: "discoverVideo",
    label: "Discover video",
    category: "Content",
    editable: true,
    fields: [
      {
        key: "videoId",
        label: "YouTube video ID",
        type: "text",
        help: "The id after youtube.com/embed/ or watch?v=.",
      },
      { key: "cardTitle", label: "Card title", type: "text" },
      { key: "cardParagraph1", label: "Card paragraph 1", type: "textarea" },
      { key: "cardParagraph2", label: "Card paragraph 2", type: "textarea" },
    ],
    defaultContent: { ...DISCOVER_VIDEO_DEFAULTS },
  },
  {
    type: "contactMap",
    label: "Contact map",
    category: "Content",
    editable: true,
    fields: [
      {
        key: "mapUrl",
        label: "Google Maps embed URL",
        type: "url",
        help: "The src URL from a Google Maps 'Embed a map' iframe.",
      },
    ],
    defaultContent: {
      mapUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3191.62085243865!2d174.74999331301763!3d-36.87549318088687!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6d0d4771e23b727d%3A0x90ba816391e739dc!2sHuman%20Nutrition%20Unit!5e0!3m2!1sen!2snz!4v1777374580042!5m2!1sen!2snz",
    },
  },
  {
    // Registered only so the editor shows a friendly name ("Contact details")
    // instead of the raw type for the existing block on the Contact page.
    // Hidden from the picker and content-frozen — its content is rendered from
    // what's already stored (see BlockRenderer's "contactDetails" case).
    type: "contactDetails",
    label: "Contact details",
    category: "Content",
    editable: false,
    hidden: true,
    fields: [],
    defaultContent: {},
  },

  // ---- Dynamic (pull live data from existing admin sections) ----
  {
    type: "recentPublications",
    label: "Recent publications",
    category: "Dynamic",
    editable: true,
    fields: [
      {
        key: "limit",
        label: "Number to show",
        type: "text",
        help: "How many recent publications to display (default 2).",
      },
    ],
    defaultContent: { limit: "2" },
  },
  {
    type: "ourPartners",
    label: "Our partners",
    category: "Dynamic",
    editable: true,
    fields: [
      {
        key: "group",
        label: "Show group",
        type: "enum",
        options: ["both", "Collaborating", "Industry"],
      },
    ],
    defaultContent: { group: "both" },
  },
  {
    type: "publicationIndex",
    label: "Publication index",
    category: "Dynamic",
    editable: true,
    fields: [
      {
        key: "pageSize",
        label: "Results per page",
        type: "text",
        help: "How many publications per page (default 10).",
      },
    ],
    defaultContent: { pageSize: "10" },
  },
  {
    // Featured cards are editable content now (not live data), so this lives in
    // the "Content" category. Card images follow the raw-path workflow noted in
    // src/lib/blocks/collaborations-content.ts.
    type: "academicCollaborators",
    label: "Academic collaborators",
    category: "Content",
    editable: true,
    fields: FEATURED_COLLABORATORS_FIELDS,
    defaultContent: { ...ACADEMIC_COLLABORATORS_DEFAULTS },
  },
  {
    type: "industryCollaborators",
    label: "Industry collaborators",
    category: "Content",
    editable: true,
    fields: FEATURED_COLLABORATORS_FIELDS,
    defaultContent: { ...INDUSTRY_COLLABORATORS_DEFAULTS },
  },
  {
    type: "teamSections",
    label: "Team members",
    category: "Dynamic",
    editable: true,
    fields: [
      {
        key: "defaultTab",
        label: "Default tab",
        type: "enum",
        options: ["all", "board", "research", "alumni"],
      },
    ],
    defaultContent: { defaultTab: "all" },
  },
  {
    type: "benefitsRow",
    label: "Benefits row",
    category: "Content",
    editable: true,
    fields: [
      {
        key: "variant",
        label: "Variant",
        type: "enum",
        options: ["academic", "industry", "both"],
      },
      { key: "title", label: "Title (optional)", type: "text" },
    ],
    defaultContent: { variant: "academic", title: "" },
  },

  // ---- Study layout blocks (study-layout builder only) ----
  // Most render the live study data (no editable content); studyHero and
  // studyProse carry editable content. All are study-scoped.
  {
    type: "studyStatusBar",
    label: "Status & language bar",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyDescription",
    label: "Description",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyCompensation",
    label: "What you'll receive",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyEligibility",
    label: "Eligibility panel",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyJoinButton",
    label: "Join now (REDCap)",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyContact",
    label: "Contact details",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyEthics",
    label: "Ethics statement",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyPdfs",
    label: "Downloads",
    category: "Study",
    scope: "study",
    editable: false,
    fields: [],
    defaultContent: {},
  },
  {
    type: "studyHero",
    label: "Study hero",
    category: "Study",
    scope: "study",
    editable: true,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title (blank = study title)", type: "text" },
      {
        key: "image",
        label: "Background image (blank = study image)",
        type: "image",
      },
    ],
    defaultContent: { eyebrow: "Our Studies", title: "", image: "" },
  },
  {
    type: "studyProse",
    label: "Free text / prose",
    category: "Study",
    scope: "study",
    editable: true,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body", type: "richText" },
      { key: "headingZh", label: "Heading (中文)", type: "text" },
      { key: "bodyZh", label: "Body (中文)", type: "richText" },
    ],
    defaultContent: {
      heading: "Section heading",
      body: "<p>Add your content here.</p>",
      headingZh: "",
      bodyZh: "",
    },
  },
  {
    type: "row",
    label: "Row (columns)",
    category: "Layout",
    scope: "both",
    editable: true,
    fields: [],
    defaultContent: { columns: [[], []], widths: [1, 1] },
  },
];

export const BLOCK_REGISTRY: Record<string, BlockDefinition> =
  Object.fromEntries(DEFINITIONS.map((def) => [def.type, def]));

// List block definitions available in a given builder scope. A block's scope
// defaults to "page"; "both" appears everywhere.
export function listBlockDefinitions(
  scope: "page" | "study" = "page",
): BlockDefinition[] {
  return DEFINITIONS.filter((def) => {
    const defScope = def.scope ?? "page";
    return defScope === "both" || defScope === scope;
  });
}

// Block definitions offered in the "Add block" picker for a scope: everything
// listable in that scope, minus blocks retired from new use (`hidden`) and any
// explicitly excluded types. Single source of truth for picker visibility —
// used by AddBlockButton and its tests so the rule can't drift.
export function listPickableBlockDefinitions(
  scope: "page" | "study" = "page",
  { exclude = [] }: { exclude?: readonly string[] } = {},
): BlockDefinition[] {
  return listBlockDefinitions(scope).filter(
    (def) => !def.hidden && !exclude.includes(def.type),
  );
}

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY[type];
}
