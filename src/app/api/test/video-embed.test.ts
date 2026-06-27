import { describe, expect, it } from "vitest";

import { extractYouTubeId } from "@/components/blocks/VideoEmbed";

const ID = "dQw4w9WgXcQ"; // 11 chars

describe("extractYouTubeId", () => {
  it("accepts a bare 11-char id (trimmed)", () => {
    expect(extractYouTubeId(ID)).toBe(ID);
    expect(extractYouTubeId(`  ${ID}  `)).toBe(ID);
  });

  it("rejects empty / non-11-char bare tokens", () => {
    expect(extractYouTubeId("")).toBe("");
    expect(extractYouTubeId("abc")).toBe("");
    expect(extractYouTubeId("not a youtube id")).toBe("");
  });

  it("parses watch URLs with v= in ANY position", () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/watch?si=abc&v=${ID}`)).toBe(ID);
    expect(
      extractYouTubeId(`https://www.youtube.com/watch?list=PLxyz&v=${ID}&t=42s`),
    ).toBe(ID);
  });

  it("parses youtu.be / embed / shorts / live (with query)", () => {
    expect(extractYouTubeId(`https://youtu.be/${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://youtu.be/${ID}?t=42`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(extractYouTubeId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
  });

  it("handles youtube-nocookie.com and protocol-less input", () => {
    expect(extractYouTubeId(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(ID);
    expect(extractYouTubeId(`youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("returns empty for non-YouTube or unparseable input", () => {
    expect(extractYouTubeId("https://vimeo.com/12345")).toBe("");
    expect(extractYouTubeId("https://www.youtube.com/watch?v=tooShort")).toBe("");
    expect(extractYouTubeId("https://example.com")).toBe("");
  });
});
