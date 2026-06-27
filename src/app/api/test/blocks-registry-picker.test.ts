import { describe, expect, it } from "vitest";
import {
  getBlockDefinition,
  listPickableBlockDefinitions,
} from "@/lib/blocks/registry";

// The "Add block" picker filters out blocks flagged `hidden` (see
// AddBlockButton), but their renderers must keep working so existing pages that
// already use them don't break. These tests lock in both halves of that.
const HIDDEN_FROM_PICKER = [
  "partnerImageGrid",
  "homepageHero",
  "discoverHero",
  "researchHero",
  "teamHero",
  "contactHero",
  "studiesHero",
  "contactDetails",
  // The homepage studies grid carries the singular #studies anchor, so it's
  // hidden from the picker; the anchor-free generic "Card grid" supersedes it.
  "homepageStudies",
];

// The exact picker contents, via the shared registry helper.
const pickerTypes = (scope: "page" | "study" = "page") =>
  listPickableBlockDefinitions(scope).map((d) => d.type);

describe("block picker visibility", () => {
  it("hides retired/page-specific blocks from the picker", () => {
    const visible = pickerTypes();
    for (const type of HIDDEN_FROM_PICKER) {
      expect(visible).not.toContain(type);
    }
  });

  it("keeps hidden blocks resolvable so existing pages still render", () => {
    for (const type of HIDDEN_FROM_PICKER) {
      expect(getBlockDefinition(type)).toBeDefined();
    }
  });

  it("keeps the generic 'Blank hero' in the picker, now under Generic blocks", () => {
    const def = getBlockDefinition("subpageHero");
    expect(def?.hidden).toBeFalsy();
    expect(def?.label).toBe("Blank hero");
    expect(def?.category).toBe("Generic blocks");
    // It moved out of Hero, and every other hero is hidden, so the Hero picker
    // section is now empty (AddBlockButton auto-skips empty categories).
    const heroesInPicker = listPickableBlockDefinitions("page").filter(
      (d) => d.category === "Hero",
    );
    expect(heroesInPicker).toEqual([]);
  });
});

describe("Generic blocks category", () => {
  const MOVED = [
    "subpageHero",
    "sectionHeading",
    "infoCardLeft",
    "infoCardRight",
    "calloutBannerLeft",
    "calloutBannerRight",
  ];
  // New, page-scoped building blocks (only wired into the page BlockRenderer).
  const NEW = [
    "prose",
    "imageBlock",
    "videoEmbed",
    "spacer",
    "accordion",
    "quote",
    "statHighlights",
    "announcements",
    "cardGrid",
  ];

  it("places the moved + new generic blocks under 'Generic blocks'", () => {
    for (const type of [...MOVED, ...NEW]) {
      expect(getBlockDefinition(type)?.category).toBe("Generic blocks");
    }
  });

  it("keeps homepageStudies as the hidden, anchored homepage block", () => {
    const def = getBlockDefinition("homepageStudies");
    expect(def?.label).toBe("Study cards row");
    expect(def?.category).toBe("Content");
    expect(def?.hidden).toBe(true);
  });

  it("exposes a generic, anchor-free 'Card grid' in the picker", () => {
    const def = getBlockDefinition("cardGrid");
    expect(def?.label).toBe("Card grid");
    expect(def?.category).toBe("Generic blocks");
    expect(def?.hidden).toBeFalsy();
    expect(pickerTypes()).toContain("cardGrid");
  });

  it("exposes the new generic blocks in the page picker", () => {
    const visible = pickerTypes("page");
    for (const type of NEW) expect(visible).toContain(type);
  });

  it("does NOT expose page-scoped generic blocks in the study picker", () => {
    // The study-layout builder uses a separate renderer; listing page-only
    // blocks there would render nothing. Lock them out of the study picker.
    const studyVisible = pickerTypes("study");
    for (const type of NEW) expect(studyVisible).not.toContain(type);
  });

  it("leaves the Hero and Heading picker sections empty after the moves", () => {
    const page = listPickableBlockDefinitions("page");
    expect(page.filter((d) => d.category === "Hero")).toEqual([]);
    expect(page.filter((d) => d.category === "Heading")).toEqual([]);
  });
});

describe("retired studiesContactCard block", () => {
  it("is removed from the registry entirely and absent from the picker", () => {
    expect(getBlockDefinition("studiesContactCard")).toBeUndefined();
    expect(pickerTypes()).not.toContain("studiesContactCard");
  });
});

describe("studies overview block", () => {
  it("is categorised as Dynamic (live data) and visible in the picker", () => {
    const def = getBlockDefinition("studiesOverview");
    expect(def?.category).toBe("Dynamic");
    expect(def?.hidden).toBeFalsy();
    expect(pickerTypes()).toContain("studiesOverview");
  });
});

describe("info card labels match what the components render", () => {
  // The InfoCardLeft/InfoCardRight components' desktop layouts are swapped, so
  // the labels (and default image crop) are deliberately the inverse of the
  // type name. Guards against a well-meaning "fix" re-introducing the bug.
  it("infoCardLeft is labelled image-right and defaults to a right crop", () => {
    const def = getBlockDefinition("infoCardLeft");
    expect(def?.label).toBe("Info card (image right)");
    expect(def?.defaultContent).toMatchObject({ imagePosition: "right" });
  });

  it("infoCardRight is labelled image-left and defaults to a left crop", () => {
    const def = getBlockDefinition("infoCardRight");
    expect(def?.label).toBe("Info card (image left)");
    expect(def?.defaultContent).toMatchObject({ imagePosition: "left" });
  });
});

describe("contactDetails block naming", () => {
  it("resolves to a friendly label so the editor doesn't show the raw type", () => {
    const def = getBlockDefinition("contactDetails");
    expect(def?.label).toBe("Contact details");
    expect(def?.editable).toBe(false);
  });
});
