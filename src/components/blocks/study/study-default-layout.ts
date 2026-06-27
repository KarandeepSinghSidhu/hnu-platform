// The canonical "original" study layout, defined in code so it can ALWAYS be
// recovered from the admin panel — even if the shared template is emptied or
// broken. The reset endpoint writes these blocks into a study override (or into
// the template itself), so the original design can never become unrecoverable.
// Pure data — safe to import from client, server and scripts.
//
// The body is a two-column `row` (the original StudyContent desktop design): the
// main study copy on the left, the eligibility panel + "Join now" call-to-action
// on the right. RowBlock renders it `flex-col` by default and switches to
// `lg:flex-row` on large screens — i.e. a single column on mobile, two columns on
// desktop — and it's fully editable in the admin Study Layout editor. A flat,
// row-less layout here is what made study pages render single-column at every
// width.
export const DEFAULT_STUDY_LAYOUT_BLOCKS: {
  type: string;
  content: Record<string, unknown>;
}[] = [
  { type: "studyHero", content: { eyebrow: "Our Studies", title: "", image: "" } },
  { type: "studyStatusBar", content: {} },
  {
    type: "row",
    content: {
      columns: [
        // Left column (wider): the main study content.
        [
          { id: "study-col-description", type: "studyDescription", content: {} },
          { id: "study-col-compensation", type: "studyCompensation", content: {} },
          { id: "study-col-pdfs", type: "studyPdfs", content: {} },
          { id: "study-col-contact", type: "studyContact", content: {} },
          { id: "study-col-ethics", type: "studyEthics", content: {} },
        ],
        // Right column (narrower): eligibility + the join CTA.
        [
          { id: "study-col-eligibility", type: "studyEligibility", content: {} },
          { id: "study-col-join", type: "studyJoinButton", content: {} },
        ],
      ],
      widths: [2, 1],
    },
  },
];
