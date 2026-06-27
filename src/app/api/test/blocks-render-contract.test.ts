import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { listPickableBlockDefinitions } from "@/lib/blocks/registry";

// No React render test exists for the api project (node env). This cheap drift
// guard reads the BlockRenderer source and asserts every page-pickable block
// type has a `case` — so a block can't be added to the picker without a renderer
// (it would otherwise fall through to the unknown-type `default` and render
// nothing on the live page).
const SRC = readFileSync(
  join(process.cwd(), "src/components/blocks/BlockRenderer.tsx"),
  "utf8",
);

const hasCase = (type: string) => SRC.includes(`case "${type}":`);

describe("BlockRenderer ↔ registry contract", () => {
  it("renders every page-pickable block type (no silent unknown-type fallthrough)", () => {
    const missing = listPickableBlockDefinitions("page")
      .map((d) => d.type)
      .filter((type) => !hasCase(type));
    expect(missing).toEqual([]);
  });

  it("wires up each new generic building block", () => {
    for (const type of [
      "prose",
      "imageBlock",
      "videoEmbed",
      "spacer",
      "accordion",
      "quote",
      "statHighlights",
      "announcements",
      "cardGrid",
    ]) {
      expect(hasCase(type)).toBe(true);
    }
  });

  it("no longer references the retired studiesContactCard", () => {
    expect(SRC).not.toContain("studiesContactCard");
    expect(SRC).not.toContain("StudiesContactCard");
  });
});
