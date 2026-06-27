// One-shot cache warmer for the 中文 auto-translation.
//
// Translation normally happens when an admin publishes a page or saves a study.
// This script does it for the WHOLE site in one go — useful right after you set
// the TRANSLATE_* env vars, so you don't have to re-publish every page by hand.
//
//   TRANSLATE_API_KEY=... TRANSLATE_REGION=... npx tsx prisma/warm-translations.ts
//   (or: npm run warm:translations  — after setting the vars in .env.local)
//
// With no TRANSLATE_API_KEY set it is a safe no-op (warns and writes nothing).

import "./load-env";
import { prisma } from "../src/lib/prisma";
import { parsePublishedSnapshot } from "../src/lib/page-publish";
import { parseBlockContent } from "../src/lib/blocks/validate";
import { warmBlockTranslations, warmStrings } from "../src/lib/translate/blocks";

async function main() {
  if (!process.env.TRANSLATE_API_KEY?.trim()) {
    console.warn(
      "[warm] TRANSLATE_API_KEY is not set — nothing to do. Set it (and TRANSLATE_PROVIDER/REGION) and re-run.",
    );
    return;
  }

  const pages = await prisma.page.findMany({
    select: { slug: true, publishedContent: true },
  });
  for (const page of pages) {
    if (!page.publishedContent) {
      console.log(`skip page "${page.slug}" (never published)`);
      continue;
    }
    const blocks = parsePublishedSnapshot(page.publishedContent).map((b) => ({
      type: b.type,
      content: parseBlockContent(b.content),
    }));
    await warmBlockTranslations(blocks, "ZH");
    console.log(`warmed page "${page.slug}" (${blocks.length} blocks)`);
  }

  const studies = await prisma.study.findMany({
    select: { title: true, shortDescription: true },
  });
  await warmStrings(
    studies.flatMap((s) => [s.title, s.shortDescription]).filter(Boolean),
    "ZH",
  );
  console.log(`warmed ${studies.length} study titles/short descriptions`);

  console.log(`TranslationCache now holds ${await prisma.translationCache.count()} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
