import { getServerLang } from "@/lib/lang";
import { getStudies, type StudyListItem } from "@/lib/data/studies";
import StudiesOverview from "./StudiesOverview";

/**
 * Server wrapper for the `studiesOverview` block: reads the active studies (with
 * 中文 localization) straight from the data layer and hands them to the client
 * StudiesOverview as props — no fetch-on-mount, content in the initial HTML.
 *
 * Reads getServerLang() per request, so a language toggle (which triggers
 * router.refresh()) re-runs this against the new cookie and re-localizes.
 */
export default async function StudiesOverviewBlock() {
  const lang = await getServerLang();
  let studies: StudyListItem[] = [];
  try {
    studies = await getStudies(lang);
  } catch (error) {
    console.error("Studies fetch failed:", error);
  }

  return <StudiesOverview studies={studies} />;
}
