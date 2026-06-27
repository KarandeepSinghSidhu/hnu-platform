import {
  getPublications,
  type IndexPublicationRecord,
} from "@/lib/data/publications";
import PublicationIndex from "./PublicationIndex";

/**
 * Server wrapper for the `publicationIndex` block: reads the approved
 * publications straight from the data layer (narrow select) and passes them to
 * the client PublicationIndex, which keeps the client-side search / year filter /
 * pagination. Replaces the previous fetch-on-mount of /api/publications.
 *
 * Per-request read on a force-dynamic page — same freshness as before.
 */
export default async function PublicationIndexBlock({
  pageSize = 10,
}: {
  pageSize?: number;
}) {
  let publications: IndexPublicationRecord[] = [];
  try {
    publications = await getPublications();
  } catch (error) {
    console.error("Publications fetch failed:", error);
  }

  return <PublicationIndex pageSize={pageSize} publications={publications} />;
}
