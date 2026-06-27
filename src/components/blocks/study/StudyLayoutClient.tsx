"use client";

import { StudyProvider, type StudyData } from "./study-context";
import StudyBlockRenderer from "./StudyBlocks";
import { parseBlockContent } from "@/lib/blocks/validate";

export interface StudyLayoutBlock {
  id: number;
  type: string;
  content: string;
}

// Client root for a custom study layout: provides the study + language context
// and renders the ordered top-level blocks. Used by both the dynamic and the
// hardcoded study routes when an override/template layout exists.
export default function StudyLayoutClient({
  study,
  blocks,
}: {
  study: StudyData;
  blocks: StudyLayoutBlock[];
}) {
  return (
    <StudyProvider study={study}>
      <section className="relative w-full bg-white py-10 sm:py-16 px-6 sm:px-12 lg:px-[45px]">
        <div className="flex flex-col gap-8">
          {blocks.map((block) => (
            <StudyBlockRenderer
              key={block.id}
              type={block.type}
              content={parseBlockContent(block.content)}
            />
          ))}
        </div>
      </section>
    </StudyProvider>
  );
}
