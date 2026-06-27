import type { ReactNode } from "react";

import HomepageHero from "@/components/sections/HomepageHero";
import DiscoverVideo from "@/components/sections/DiscoverVideo";
import StudiesOverviewBlock from "@/components/sections/StudiesOverviewBlock";
import TrialDesign from "@/components/sections/TrialDesign";
import RecentPublicationsBlock from "@/components/sections/RecentPublicationsBlock";
import OurPartners from "@/components/sections/OurPartners";
import PublicationIndexBlock from "@/components/sections/PublicationIndexBlock";
import AcademicCollaborators from "@/components/sections/AcademicCollaborators";
import IndustryCollaborators from "@/components/sections/IndustryCollaborators";
import BenefitsRow from "@/components/sections/BenefitsRow";
import SectionHeading from "@/components/sections/SectionHeading";
import CollaborationsIntro from "@/components/sections/CollaborationsIntro";
import PartnerImageGrid from "@/components/sections/PartnerImageGrid";
import ContactMap from "@/components/sections/ContactMap";
import ContactDetails from "@/components/sections/ContactDetails";
import StudiesHero from "@/components/layout/StudiesHero";
import InfoCardLeft from "@/components/ui/InfoCardLeft";
import InfoCardRight from "@/components/ui/InfoCardRight";
import CalloutBannerLeft from "@/components/ui/CalloutBannerLeft";
import CalloutBannerRight from "@/components/ui/CalloutBannerRight";
import SubpageHeroBlock from "@/components/blocks/SubpageHeroBlock";
import TeamSectionsBlock from "@/components/blocks/TeamSectionsBlock";
import HomepageStudiesBlock from "@/components/blocks/HomepageStudiesBlock";
import Updates from "@/components/sections/Updates";
import ProseBlock from "@/components/blocks/ProseBlock";
import ImageBlock from "@/components/blocks/ImageBlock";
import VideoEmbed from "@/components/blocks/VideoEmbed";
import Spacer from "@/components/blocks/Spacer";
import AccordionBlock from "@/components/blocks/AccordionBlock";
import QuoteBlock from "@/components/blocks/QuoteBlock";
import StatHighlights from "@/components/blocks/StatHighlights";

import { parseBlockContent, serializeBlockContent } from "@/lib/blocks/validate";
import { getBlockDefinition } from "@/lib/blocks/registry";
import { readRowContent } from "@/lib/blocks/row";
import type { RowChild, StudyCardContent, UpdateItem } from "@/lib/blocks/types";

type Content = Record<string, unknown>;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const bool = (v: unknown): boolean => v === true;
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

type ImagePosition = "center" | "right" | "left" | "top" | "bottom";
const imgPos = (v: unknown): ImagePosition | undefined =>
  v === "center" || v === "right" || v === "left" || v === "top" || v === "bottom"
    ? v
    : undefined;
const cardBg = (v: unknown): "dark" | "standard" | "light" | undefined =>
  v === "dark" || v === "standard" || v === "light" ? v : undefined;
const partnerGroup = (
  v: unknown,
): "both" | "Collaborating" | "Industry" | undefined =>
  v === "both" || v === "Collaborating" || v === "Industry" ? v : undefined;
const teamTab = (
  v: unknown,
): "all" | "board" | "research" | "alumni" | undefined =>
  v === "all" || v === "board" || v === "research" || v === "alumni"
    ? v
    : undefined;

// Coerce persisted card JSON into a safe StudyCardContent[]: every field becomes
// a string (so nothing undefined or non-string reaches next/image's `src`). Keeps
// cards without an image — StudyCard renders a neutral placeholder for an empty
// src, so a malformed/imageless entry can't crash the render.
const cardList = (v: unknown): StudyCardContent[] =>
  (Array.isArray(v) ? v : []).map((card) => {
    const o = (
      card && typeof card === "object" ? card : {}
    ) as Record<string, unknown>;
    return {
      title: str(o.title),
      subtitle: str(o.subtitle) || undefined,
      description: str(o.description),
      buttonLabel: str(o.buttonLabel) || undefined,
      buttonHref: str(o.buttonHref) || undefined,
      imageSrc: str(o.imageSrc),
      imageAlt: str(o.imageAlt),
      imagePosition: imgPos(o.imagePosition),
    };
  });

// Featured-collaborator cards additionally drop imageless entries — that design
// has no empty-image state and falls back to its defaults when the list is empty.
const studyCards = (v: unknown): StudyCardContent[] =>
  cardList(v).filter((card) => card.imageSrc !== "");

function infoCardProps(c: Content) {
  return {
    title: str(c.title),
    paragraphs: strArray(c.paragraphs),
    body: str(c.body) || undefined,
    imageSrc: str(c.imageSrc),
    imageAlt: str(c.imageAlt),
    imagePosition: imgPos(c.imagePosition),
    cardBg: cardBg(c.cardBg),
    showButton: bool(c.showButton),
    buttonLabel: str(c.buttonLabel) || undefined,
    buttonHref: str(c.buttonHref) || undefined,
  };
}

// Builds SubpageHeroBlock props from block content, falling back to the block
// type's registry defaults (the original hardcoded title/subtitle) when a field
// is empty — so a freshly-converted block with empty content renders unchanged.
function subpageHeroFromContent(type: string, c: Content) {
  const dc = getBlockDefinition(type)?.defaultContent ?? {};
  const width = c.subtitleMaxWidth;
  const defWidth = dc.subtitleMaxWidth;
  const resolvedWidth =
    typeof width === "number" || (typeof width === "string" && width !== "")
      ? width
      : typeof defWidth === "number" || typeof defWidth === "string"
        ? defWidth
        : undefined;
  return {
    title: str(c.title) || str(dc.title),
    subtitle: str(c.subtitle) || str(dc.subtitle),
    subtitleMaxWidth: resolvedWidth as string | number | undefined,
  };
}

/** Renders a single block given its type and raw JSON content string. */
export default function BlockRenderer({
  type,
  content: rawContent,
}: {
  type: string;
  content: string;
}): ReactNode {
  const c = parseBlockContent(rawContent);

  switch (type) {
    // Heroes
    case "homepageHero":
      return (
        <HomepageHero
          title={str(c.title) || undefined}
          buttonLabel={str(c.buttonLabel) || undefined}
          buttonHref={str(c.buttonHref) || undefined}
          backgroundGradient={str(c.backgroundGradient) || undefined}
          heroImageSrc={str(c.heroImageSrc) || undefined}
        />
      );
    // The page-specific heroes share the SubpageHero markup; empty content
    // falls back to the registry defaults (the original hardcoded values).
    case "discoverHero":
    case "researchHero":
    case "teamHero":
    case "contactHero":
      return <SubpageHeroBlock {...subpageHeroFromContent(type, c)} />;
    case "studiesHero":
      return <StudiesHero />;

    // Editable hero
    case "subpageHero":
      return (
        <SubpageHeroBlock
          title={str(c.title)}
          subtitle={str(c.subtitle)}
          subtitleMaxWidth={
            typeof c.subtitleMaxWidth === "number" ||
            typeof c.subtitleMaxWidth === "string"
              ? c.subtitleMaxWidth
              : undefined
          }
        />
      );

    // Generic building blocks (content-neutral)
    case "prose":
      return (
        <ProseBlock
          heading={str(c.heading) || undefined}
          body={str(c.body) || undefined}
          align={c.align === "center" ? "center" : "left"}
        />
      );
    case "imageBlock": {
      const height =
        c.height === "small" || c.height === "large" ? c.height : "medium";
      return (
        <ImageBlock
          imageSrc={str(c.imageSrc) || undefined}
          imageAlt={str(c.imageAlt)}
          caption={str(c.caption) || undefined}
          height={height}
          rounded={c.rounded !== false}
        />
      );
    }
    case "videoEmbed":
      return (
        <VideoEmbed
          videoId={str(c.videoId)}
          heading={str(c.heading) || undefined}
          caption={str(c.caption) || undefined}
        />
      );
    case "accordion": {
      const items = (Array.isArray(c.items) ? c.items : []).map((it) => {
        const o =
          it && typeof it === "object" ? (it as Record<string, unknown>) : {};
        return { question: str(o.question), answer: str(o.answer) };
      });
      return (
        <AccordionBlock heading={str(c.heading) || undefined} items={items} />
      );
    }
    case "quote":
      return (
        <QuoteBlock
          quote={str(c.quote) || undefined}
          attribution={str(c.attribution) || undefined}
          role={str(c.role) || undefined}
        />
      );
    case "statHighlights": {
      const items = (Array.isArray(c.items) ? c.items : []).map((it) => {
        const o =
          it && typeof it === "object" ? (it as Record<string, unknown>) : {};
        return { value: str(o.value), label: str(o.label) };
      });
      return (
        <StatHighlights heading={str(c.heading) || undefined} items={items} />
      );
    }
    case "spacer": {
      const size =
        c.size === "small" || c.size === "large" ? c.size : "medium";
      return <Spacer size={size} divider={c.divider === true} />;
    }

    // Editable content
    case "infoCardLeft":
      return <InfoCardLeft {...infoCardProps(c)} />;
    case "infoCardRight":
      return <InfoCardRight {...infoCardProps(c)} />;
    case "calloutBannerRight":
      return (
        <CalloutBannerRight
          leftTitle={str(c.leftTitle) || undefined}
          leftDescription={str(c.leftDescription) || undefined}
          title={str(c.title)}
          description={str(c.description)}
          showButton={bool(c.showButton)}
          buttonLabel={str(c.buttonLabel) || undefined}
          buttonHref={str(c.buttonHref) || undefined}
          backgroundImage={str(c.backgroundImage) || undefined}
          backgroundColor={str(c.backgroundColor) || undefined}
        />
      );
    case "calloutBannerLeft":
      return (
        <CalloutBannerLeft
          rightTitle={str(c.rightTitle) || undefined}
          rightDescription={str(c.rightDescription) || undefined}
          title={str(c.title)}
          description={str(c.description)}
          showButton={bool(c.showButton)}
          buttonLabel={str(c.buttonLabel) || undefined}
          buttonHref={str(c.buttonHref) || undefined}
          backgroundImage={str(c.backgroundImage) || undefined}
          backgroundColor={str(c.backgroundColor) || undefined}
        />
      );
    case "homepageStudies":
      // The homepage studies grid carries the singular #studies scroll anchor.
      return <HomepageStudiesBlock anchorId="studies" cards={cardList(c.cards)} />;
    case "cardGrid":
      // Generic, anchor-free card grid (reuses the same component).
      return <HomepageStudiesBlock cards={cardList(c.cards)} />;
    // `announcements` is the generic, content-neutral sibling of `updates`;
    // both render through the same Updates carousel.
    case "announcements":
    case "updates": {
      const items = (Array.isArray(c.updates) ? c.updates : []) as UpdateItem[];
      const normalized = items.map((it) => ({
        title: str(it?.title),
        date: str(it?.date) || undefined,
        paragraphs: strArray(it?.paragraphs),
      }));
      // The carousel reads updates[current]; render nothing when empty.
      if (normalized.length === 0) return null;
      const isAnnouncements = type === "announcements";
      return (
        <Updates
          updates={normalized}
          backgroundColor={str(c.backgroundColor) || undefined}
          ariaLabelEn={isAnnouncements ? "Announcements" : undefined}
          ariaLabelZh={isAnnouncements ? "公告" : undefined}
        />
      );
    }
    case "sectionHeading":
      return (
        <SectionHeading
          text={str(c.text)}
          heightClass={str(c.heightClass, "h-32")}
        />
      );
    case "partnerImageGrid":
      return (
        <PartnerImageGrid
          breadcrumbLabel={str(c.breadcrumbLabel)}
          images={strArray(c.images)}
          variant={c.variant === "industry" ? "industry" : "academic"}
        />
      );
    case "benefitsRow":
      return (
        <BenefitsRow
          variant={
            c.variant === "industry"
              ? "industry"
              : c.variant === "both"
                ? "both"
                : "academic"
          }
          title={str(c.title) || undefined}
        />
      );

    // Editable collaborations blocks. Empty fields fall back to each
    // component's defaults (the original copy/images), so a freshly-converted
    // block renders unchanged. `str()`/`strArray()` coerce untrusted JSON; the
    // resolver has already turned any "media:{id}" refs into plain paths.
    case "collaborationsIntro":
      return (
        <CollaborationsIntro
          sectionTitle={str(c.sectionTitle) || undefined}
          sectionText={str(c.sectionText) || undefined}
          pathwayTitle={str(c.pathwayTitle) || undefined}
          pathwaySteps={
            Array.isArray(c.pathwaySteps) ? strArray(c.pathwaySteps) : undefined
          }
          image={str(c.image) || undefined}
          imageAlt={str(c.imageAlt) || undefined}
          complianceTitle={str(c.complianceTitle) || undefined}
          complianceText={str(c.complianceText) || undefined}
        />
      );

    // Content-frozen
    case "studiesOverview":
      return <StudiesOverviewBlock />;
    case "trialDesign":
      return (
        <TrialDesign
          heading={str(c.heading) || undefined}
          intro={str(c.intro) || undefined}
          residentialHeading={str(c.residentialHeading) || undefined}
          residentialBody={str(c.residentialBody) || undefined}
          communityHeading={str(c.communityHeading) || undefined}
          communityBody={str(c.communityBody) || undefined}
        />
      );
    case "discoverVideo":
      return (
        <DiscoverVideo
          videoId={str(c.videoId) || undefined}
          cardTitle={str(c.cardTitle) || undefined}
          cardParagraph1={str(c.cardParagraph1) || undefined}
          cardParagraph2={str(c.cardParagraph2) || undefined}
        />
      );
    case "contactMap":
      return <ContactMap mapUrl={str(c.mapUrl) || undefined} />;
    case "contactDetails":
      return (
        <ContactDetails
          cardOneTitle={str(c.cardOneTitle) || undefined}
          cardOneBody={str(c.cardOneBody) || undefined}
          cardTwoTitle={str(c.cardTwoTitle) || undefined}
          cardTwoBody={str(c.cardTwoBody) || undefined}
          cardThreeTitle={str(c.cardThreeTitle) || undefined}
          cardThreeBody={str(c.cardThreeBody) || undefined}
          phone={str(c.phone) || undefined}
          phoneHref={str(c.phoneHref) || undefined}
          address={str(c.address) || undefined}
        />
      );

    // Dynamic (live data, with optional display config)
    case "recentPublications":
      return <RecentPublicationsBlock limit={Number(c.limit) || undefined} />;
    // TODO: remove once carousel-deletion PR lands (Karendeep). The OurPartners
    // marquee + its home-page seed + the OurPartners component go together —
    // coordinate merge order so this case isn't deleted before the seed is.
    case "ourPartners":
      return <OurPartners group={partnerGroup(c.group)} />;
    case "publicationIndex":
      return <PublicationIndexBlock pageSize={Number(c.pageSize) || undefined} />;
    case "academicCollaborators": {
      const cards = studyCards(c.cards);
      return (
        <AcademicCollaborators
          heading={str(c.heading) || undefined}
          cards={cards.length > 0 ? cards : undefined}
          buttonLabel={str(c.buttonLabel) || undefined}
          buttonHref={str(c.buttonHref) || undefined}
        />
      );
    }
    case "industryCollaborators": {
      const cards = studyCards(c.cards);
      return (
        <IndustryCollaborators
          heading={str(c.heading) || undefined}
          cards={cards.length > 0 ? cards : undefined}
          buttonLabel={str(c.buttonLabel) || undefined}
          buttonHref={str(c.buttonHref) || undefined}
        />
      );
    }
    case "teamSections":
      return <TeamSectionsBlock defaultTab={teamTab(c.defaultTab)} />;

    // Layout: a row of 1–3 columns whose children are themselves blocks. Rows
    // can't nest (validated on write), so a row child is rendered directly.
    case "row": {
      const { columns, widths } = readRowContent(c);
      const renderChild = (child: RowChild) =>
        child.type === "row" ? null : (
          <BlockRenderer
            key={child.id}
            type={child.type}
            content={serializeBlockContent(child.content)}
          />
        );
      if (columns.length === 1) {
        return (
          <div className="flex flex-col gap-8">{columns[0].map(renderChild)}</div>
        );
      }
      return (
        // The OUTER div establishes the query container; the INNER flex queries
        // it (a container query reads an ANCESTOR container, never the element's
        // own size). So the column split keys off the row's available width —
        // like the child blocks do — stacking in any narrow context, not just a
        // narrow viewport. @5xl ≈ the previous `lg` breakpoint at full width.
        <div className="@container">
          <div className="flex flex-col gap-8 @5xl:flex-row @5xl:items-start">
            {columns.map((col, i) => (
              <div
                key={i}
                className="flex min-w-0 w-full flex-col gap-8 @5xl:w-auto"
                style={{ flexGrow: widths[i], flexBasis: 0 }}
              >
                {col.map(renderChild)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      // Prod-visible signal: a drifted/unknown block type would otherwise vanish
      // silently (the page still 200s). Log unconditionally so it's diagnosable.
      console.error(`[BlockRenderer] Unknown block type: ${type}`);
      return null;
  }
}
