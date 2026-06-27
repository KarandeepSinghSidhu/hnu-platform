import { describe, expect, it } from "vitest";
import { getBlockDefinition } from "@/lib/blocks/registry";

// The Updates carousel's editable background colour (mirrors the callout
// banners): the registry must expose the field so the page editor renders an
// input for it, and default it to "" so existing blocks keep the built-in
// navy until an editor sets something.
describe("updates block registry definition", () => {
  it("exposes an editable backgroundColor text field", () => {
    const def = getBlockDefinition("updates");
    expect(def).toBeTruthy();
    expect(def?.fields).toContainEqual(
      expect.objectContaining({ key: "backgroundColor", type: "text" }),
    );
  });

  it("defaults backgroundColor to empty (= built-in dark navy)", () => {
    const def = getBlockDefinition("updates");
    expect(def?.defaultContent).toMatchObject({ backgroundColor: "" });
  });

  it("keeps the updates list as the first field", () => {
    const def = getBlockDefinition("updates");
    expect(def?.fields[0]).toMatchObject({ key: "updates", type: "updatesList" });
  });
});
