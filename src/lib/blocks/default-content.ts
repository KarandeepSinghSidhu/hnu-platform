// Default content for the larger converted blocks, shared as the single source
// of truth between the component (default props / render fallback), the registry
// (defaultContent for new blocks + the migration backfill) and the seed.
// Pure data — safe to import from client, server and scripts.

export const DISCOVER_VIDEO_DEFAULTS = {
  videoId: "FSvG3KU8-uo",
  cardTitle: "Who are we",
  cardParagraph1:
    "HNU is a University of Auckland research facility, established in 1998 as a collaboration between the School of Biological Sciences and the Department of Medicine at the University of Auckland.",
  cardParagraph2:
    "It is New Zealand's only live-in nutrition trials facility which has the capability to carry out long-term human residential studies.",
} as const;

export const TRIAL_DESIGN_DEFAULTS = {
  heading: "Trial Design",
  intro:
    "<p>The Human Nutrition Unit carries out intervention trials investigating the relationships between diet and markers of health and disease.</p><p>Trials are randomised, placebo-controlled, single or double blind interventions and may be of either a cross-over or parallel design.</p><p>All trials are required to conform to human ethics procedures and good clinical practice (GCP), and human ethics committee approval is mandatory. Therapeutic trials are also required to obtain NZ Standing Committee on Therapeutic Trials (SCOTT) and MedSafe approval.</p>",
  residentialHeading: "Residential Trials",
  residentialBody:
    "<p><strong>Day stay (single day) studies</strong> carried out within the Human Nutrition Unit research clinic – these studies require volunteer participants to spend the day at the Unit where a range of tests are carried. Most studies are complete by 5pm when volunteers return home.</p><p><strong>Longer term (1-4 weeks) residential studies</strong> carried out within the Human Nutrition Unit residential facility – these studies require volunteer participants to live at the Unit and follow a carefully controlled dietary regime. Breakfast, dinner and overnight stay occur within the comfortable facilities of the Unit. During the day participants may attend work or study taking with them their food requirements for the day. Careful control and provision of all dietary components increases both the accuracy of the trial, since precise dietary components can be altered, and the compliance of the participants.</p><p>Many of these studies are of a 'cross-over' design, where the participant completes both the treatment and control arms of the trial. This gives additional power to the study to detect significant effects of the dietary component under investigation using only a small number of trial subjects.</p><p>Entry into the trial is randomised and treatment group blinded until completion.</p>",
  communityHeading: "Community Trials",
  communityBody:
    "<p><strong>Long term (3-6 months) community studies</strong> which require visits to the Human Nutrition Unit research clinic for blood tests and other measurements – study participants continue their usual home life attending clinical visits to collect dietary test components and for study measurements. Long term studies allow the testing of products such as putative weight loss agents to be trialed.</p><p>Many of these studies are of a 'parallel' design, where participants are randomised into either the treatment or the control arm of the trial.</p>",
} as const;

