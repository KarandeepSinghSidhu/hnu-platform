import { describe, expect, it } from "vitest";

import { getBlockDefinition } from "@/lib/blocks/registry";
import { validateBlockForWrite } from "@/lib/blocks/validate";
import type { FieldType } from "@/lib/blocks/types";

// The generic "building blocks" added for the page editor. All are page-scoped
// (only wired into the page BlockRenderer) and content-neutral.
const NEW_TYPES = [
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

const KNOWN_FIELD_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  "text",
  "textarea",
  "paragraphArray",
  "image",
  "imageArray",
  "url",
  "enum",
  "boolean",
  "studyCards",
  "updatesList",
  "faqList",
  "statList",
  "richText",
]);

describe("new generic building blocks", () => {
  it("accepts each new block's default content on the write path", () => {
    for (const type of NEW_TYPES) {
      const def = getBlockDefinition(type);
      expect(def).toBeDefined();
      const res = validateBlockForWrite(type, def!.defaultContent);
      expect(res.ok).toBe(true);
    }
  });

  it("registers each as a page-scoped Generic block with known field types", () => {
    for (const type of NEW_TYPES) {
      const def = getBlockDefinition(type)!;
      expect(def.category).toBe("Generic blocks");
      expect(def.scope ?? "page").toBe("page");
      expect(def.editable).toBe(true);
      for (const f of def.fields) {
        expect(KNOWN_FIELD_TYPES.has(f.type)).toBe(true);
        // The generic <select> editor needs options to render any choices.
        if (f.type === "enum") {
          expect(Array.isArray(f.options) && f.options.length > 0).toBe(true);
        }
      }
    }
  });

  it("defaults every enum field to one of its declared options", () => {
    for (const type of NEW_TYPES) {
      const def = getBlockDefinition(type)!;
      const content = def.defaultContent as Record<string, unknown>;
      for (const f of def.fields) {
        if (f.type !== "enum") continue;
        const val = content[f.key];
        if (val === undefined || val === "") continue;
        expect(f.options).toContain(val);
      }
    }
  });
});
