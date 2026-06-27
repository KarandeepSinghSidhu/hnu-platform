import {
  getRecentPublications,
  type RecentPublicationRecord,
} from "@/lib/data/publications";
import RecentPublications from "./RecentPublications";

/**
 * Server wrapper for the `recentPublications` block: reads the newest
 * publications straight from the data layer (narrow select + take) and passes
 * them to the client RecentPublications component as props — so the homepage no
 * longer ships the entire publications table to render two cards.
 *
 * Mirrors how BlockRenderer renders the async OurPartners server component; the
 * read is per-request on a force-dynamic page, so newly approved/edited
 * publications still appear on the next load (no caching introduced).
 */
export default async function RecentPublicationsBlock({
  limit = 2,
}: {
  limit?: number;
}) {
  let publications: RecentPublicationRecord[] = [];
  try {
    publications = await getRecentPublications(limit);
  } catch (error) {
    console.error("Recent publications fetch failed:", error);
  }

  return <RecentPublications publications={publications} />;
}
