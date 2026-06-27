import { getPartnerLogos, type PartnerLogoRecord } from "@/lib/data/partner-logos";
import PartnerSectionTitle from "./PartnerSectionTitle";
import { NewTabHint } from "@/components/ui/NewTabHint";

function PartnerMarquee({
  partners,
  ariaLabel,
}: {
  partners: PartnerLogoRecord[];
  ariaLabel: string;
}) {
  const items = [...partners, ...partners];

  return (
    <div className="overflow-hidden w-full" aria-label={ariaLabel}>
      <div
        className="marquee-track flex items-center gap-8 sm:gap-12 lg:gap-16"
        aria-hidden="true"
      >
        {items.map((partner, idx) => (
          <div
            key={`${partner.id}-${idx}`}
            className="flex-none w-[160px] sm:w-[200px] lg:w-[240px] h-[100px] sm:h-[120px] lg:h-[140px] bg-white flex items-center justify-center"
          >
            {partner.websiteUrl ? (
              <a
                href={partner.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full w-full items-center justify-center"
              >
                <img
                  src={partner.logoPath}
                  alt={partner.name}
                  loading="lazy"
                  decoding="async"
                  className="max-w-full max-h-full object-contain"
                />
                <NewTabHint />
              </a>
            ) : (
              <img
                src={partner.logoPath}
                alt={partner.name}
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function OurPartners({
  group = "both",
}: {
  group?: "both" | "Collaborating" | "Industry";
} = {}) {
  let partnerLogos: PartnerLogoRecord[] = [];

  try {
    partnerLogos = await getPartnerLogos();
  } catch (error) {
    console.error("Partner logos fetch failed:", error);
  }

  const collaborating = partnerLogos.filter((p) => p.group === "Collaborating");
  const industry = partnerLogos.filter((p) => p.group === "Industry");

  return (
    <section className="bg-white py-14 sm:py-18 lg:py-24">
      {(group === "both" || group === "Collaborating") &&
        collaborating.length > 0 && (
        <div className="mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c0c48] text-center mb-8 px-6">
            <PartnerSectionTitle type="collaborating" />
          </h2>
          <PartnerMarquee
            partners={collaborating}
            ariaLabel="Collaborating partners"
          />
        </div>
      )}

      {(group === "both" || group === "Industry") && industry.length > 0 && (
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c0c48] text-center mb-8 px-6">
            <PartnerSectionTitle type="industry" />
          </h2>
          <PartnerMarquee
            partners={industry}
            ariaLabel="Current industry partners"
          />
        </div>
      )}
    </section>
  );
}
