// Resets and re-populates the local development database with the baseline
// content the app expects (studies, team, publications, partners, inquiry
// types, filter config, page blocks). Destructive: deleteMany() wipes the
// seeded tables first, so this is for local/dev only — never run against prod.
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, TeamSection } from "@prisma/client";
import { seedPageBlocks } from "./seed-page-blocks";
import {
  DEFAULT_AFFILIATION_PHRASES,
  DEFAULT_EXCLUSION_KEYWORDS,
  DEFAULT_INSTITUTION_RORS,
  DEFAULT_MIN_YEAR,
  DEFAULT_ROUTES,
  DEFAULT_STRONG_KEYWORDS,
  DEFAULT_WEAK_KEYWORDS,
} from "../src/lib/publication-filter";
import { ORIGINAL_INQUIRY_TYPES } from "./inquiry-type-seed-data";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function getTeamMemberByName(name: string) {
  return prisma.teamMember.findFirst({
    where: { name },
  });
}

const PARTNER_LOGOS = [
  { name: "AgResearch", logoPath: "/images/partners/1722396919-ocs_art_37_the_great_kiwi_earthworm_survey_agresearch_logo-colour.jpg", group: "Collaborating" },
  { name: "University of Canterbury DTA", logoPath: "/images/partners/dta-logo-uc.jpeg", group: "Collaborating" },
  { name: "High Performance Sport NZ", logoPath: "/images/partners/HPSNZ-Black-Horizontal.jpg", group: "Industry" },
  { name: "A*STAR SIFBI", logoPath: "/images/partners/Logo_astar_sifbi-e1619082277983.png", group: "Collaborating" },
  { name: "Medical University of Sofia", logoPath: "/images/partners/Logo_MU_Sofia.png", group: "Collaborating" },
  { name: "University of California", logoPath: "/images/partners/logo_UCA_Long_300dpi.png", group: "Collaborating" },
  { name: "Wageningen University", logoPath: "/images/partners/logo_wageningen.png", group: "Collaborating" },
  { name: "Maastricht University", logoPath: "/images/partners/Maastricht-University.png", group: "Collaborating" },
  { name: "Massey University", logoPath: "/images/partners/Massey-ui-logo-profile.jpg", group: "Collaborating" },
  { name: "Newcastle University", logoPath: "/images/partners/newcastle_university_logo.png.webp", group: "Collaborating" },
  { name: "New Zealand Defence Force", logoPath: "/images/partners/Nzdf-logo.png", group: "Industry" },
  { name: "Plant & Food Research", logoPath: "/images/partners/PFR-print.jpg", group: "Industry" },
  { name: "Riddet Institute", logoPath: "/images/partners/Riddet_MaoriLogo_Stacked_CMYK_2019-d22aacda.jpeg", group: "Collaborating" },
  { name: "University of Nottingham", logoPath: "/images/partners/the-university-of-nottingham-1-logo-png-transparent.png", group: "Collaborating" },
  { name: "University of Sydney", logoPath: "/images/partners/the-university-of-sydney-vector-logo.png", group: "Collaborating" },
  { name: "University of Lisbon", logoPath: "/images/partners/uni-of-lisbon-logo.x96648cc0.png", group: "Collaborating" },
  { name: "University of Navarra", logoPath: "/images/partners/UNIVERSIDAD DE NAVARRA.jpg", group: "Collaborating" },
  { name: "University of Copenhagen", logoPath: "/images/partners/university-of-copenhagen.png", group: "Collaborating" },
  { name: "University of Otago", logoPath: "/images/partners/university-of-otago-logo-profile.jpg", group: "Collaborating" },
];

async function main() {
  await prisma.publicationAuthor.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.publicationCategory.deleteMany();
  await prisma.study.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.partnerLogo.deleteMany();
  await prisma.contactRecipient.deleteMany();
  await prisma.publicationFilterSetting.deleteMany();

  // Branding singleton: ensure the row exists; empty paths = built-in defaults.
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  await prisma.study.createMany({
    data: [
      {
        slug: "nz-synergy",
        title: "NZ Synergy Study",
        shortDescription:
          "A 2-week residential nutrition study for adults with elevated fasting blood sugar.",
        fullDescriptionEn:
          "Would you like to participate in a residential nutrition study? Would you like to learn about how diet affects diabetes risk? The NZ Synergy Study is a two-week residential nutrition intervention at the Human Nutrition Unit. We investigate how different diets affect markers of diabetes risk.",
        fullDescriptionZh:
          "您是否希望参加一项住院营养研究？您是否想了解饮食如何影响糖尿病风险？NZ Synergy Study 是在 Human Nutrition Unit 进行的两周住院营养干预研究。我们将研究不同饮食如何影响糖尿病风险指标。",
        eligibilityEn:
          "You may be eligible if you are aged 18–70 years, have a BMI between 18.5 and 30 kg/m², are located in Tāmaki Makaurau (Auckland area), and are happy to stay at the Human Nutrition Unit for 2 weeks. Chinese or European Caucasian adults with elevated fasting blood sugar may also be eligible — see the official study page for full criteria.",
        eligibilityZh:
          "若您年龄在18至70岁之间、BMI在18.5至30 kg/m²之间、位于奥克兰（Tāmaki Makaurau）地区，并愿意在 Human Nutrition Unit 住宿两周，您可能符合纳入条件。空腹血糖偏高的华人或欧洲裔高加索成年人也可能符合要求——完整标准请参阅官方研究页面。",
        compensationEn:
          "Please refer to the official Human Nutrition Unit study page for compensation details.",
        compensationZh: "补偿信息请参阅 Human Nutrition Unit 官方研究页面。",
        redcapUrl:
          "https://hnu-auckland.webflow.io/about/join-nz-synergy-study-can-yu-xin-xi-lan-xie-tong-ying-yang-yan-jiu",
        contactEmail: "HNU_SYNERGY@auckland.ac.nz",
        contactPhone: "02109195443",
        contactPhoneZh: "02109196703",
        imagePath: "/NZ Synergy Study.jpg",
        ethicsStatement:
          "This study has received ethical approval from the Southern Health and Disability Ethics Committee (20/STH/51).",
        isActive: true,
        status: "Recruiting",
        category: "",
        order: 1,
      },
      {
        slug: "food-beverage",
        title: "NZ Food & Beverage Study",
        shortDescription:
          "A short-term metabolism study involving 1 screening visit and 2 study visits.",
        fullDescriptionEn:
          "Would you like to participate in a short-term nutrition study? Would you like to learn about how different foods affect your body? The NZ Food & Beverage Study investigates how different foods and beverages affect your metabolic rate, fat burn, blood sugar levels, and appetite. The study involves 1 screening visit and 2 study visits.",
        fullDescriptionZh:
          "您是否希望参加一项短期营养研究？您是否想了解不同食物如何影响身体？NZ Food & Beverage Study 研究不同食物和饮料如何影响代谢率、脂肪燃烧、血糖水平和食欲。研究包括1次筛查访问和2次研究访问。",
        eligibilityEn:
          "You may be eligible if you are aged 18–70 years, have a BMI between 18.5 and 30 kg/m², are located in Tāmaki Makaurau (Auckland area), and are happy to complete 3 visits to the Human Nutrition Unit. European Caucasian or Asian Chinese adults may be eligible — see the official study page for full criteria.",
        eligibilityZh:
          "若您年龄在18至70岁之间、BMI在18.5至30 kg/m²之间、位于奥克兰地区，并愿意完成3次 Human Nutrition Unit 访问，您可能符合纳入条件。欧洲裔高加索或亚裔华人成年人也可能符合要求——完整标准请参阅官方研究页面。",
        compensationEn:
          "Please refer to the official Human Nutrition Unit study page for compensation details.",
        compensationZh: "补偿信息请参阅 Human Nutrition Unit 官方研究页面。",
        redcapUrl: "https://www.hnu.auckland.ac.nz/nz-food-and-beverage-study",
        contactEmail: "HNU_SYNERGY@auckland.ac.nz",
        contactPhone: "02109195443",
        contactPhoneZh: "021196703",
        imagePath: "/nz-food-beverage-study.jpg",
        ethicsStatement:
          "This study has received ethical approval from the NZ Southern Health and Disability Ethics Committee (21/STH/231).",
        isActive: true,
        status: "Recruiting",
        category: "",
        order: 2,
      },
      {
        slug: "ferdinand",
        title: "Ferdinand Study",
        shortDescription:
          "A 6-month weight loss study involving feijoa powder, HNU visits, and a Cambridge diet.",
        fullDescriptionEn:
          "Would you like to participate in a 6-month nutrition study? Would you like to lose weight? Are you concerned about your diabetes risk? The Ferdinand Study investigates whether daily consumption of feijoa whole fruit powder alters the risk of developing type 2 diabetes. The study involves 7 visits to the Human Nutrition Unit and the Cambridge diet.",
        fullDescriptionZh:
          "您是否希望参加一项为期6个月的营养研究？您是否希望减重？您是否担心糖尿病风险？Ferdinand Study 研究每日食用费约果全果粉是否会改变患2型糖尿病的风险。研究包括7次 Human Nutrition Unit 访问及 Cambridge 饮食计划。",
        eligibilityEn:
          "You may be eligible if you have elevated blood glucose but are not diabetic, are aged 18–70 years, are overweight or obese, are located in Tāmaki Makaurau (Auckland area), and are happy to complete 7 visits to the Human Nutrition Unit.",
        eligibilityZh:
          "若您血糖偏高但未患糖尿病、年龄在18至70岁之间、超重或肥胖、位于奥克兰（Tāmaki Makaurau）地区，并愿意完成7次 Human Nutrition Unit 访问，您可能符合纳入条件。",
        compensationEn:
          "Please refer to the official Human Nutrition Unit study page for compensation details.",
        compensationZh: "补偿信息请参阅 Human Nutrition Unit 官方研究页面。",
        redcapUrl: "TODO_REAL_REDCAP_URL",
        contactEmail: "FERDINAND@auckland.ac.nz",
        contactPhone: "09 923 4567",
        contactPhoneZh: "09 923 4567",
        imagePath: "/Ferdinand Study.jpg",
        ethicsStatement:
          "This study has received ethical approval from the Auckland Health Research Ethics Committee (2022 EXP 12032).",
        isActive: true,
        status: "Recruiting",
        category: "",
        order: 3,
      },
    ],
  });

  // Inquiry types: category is the immutable key; labels (shared with the
  // db-push backfill via ORIGINAL_INQUIRY_TYPES) are what the public form shows
  // per language. Recipient inboxes are placeholders to fill in per deployment.
  const recipientEmails: Record<string, string> = {
    "Study Participant Enquiry": "TODO_PARTICIPANT@auckland.ac.nz",
    "Industry Partnership": "TODO_PARTNERSHIPS@auckland.ac.nz",
    "Internship or PhD Opportunity": "TODO_STUDENTS@auckland.ac.nz",
    Donation: "TODO_DONATIONS@auckland.ac.nz",
    "General Enquiry": "TODO_GENERAL@auckland.ac.nz",
    Other: "TODO_GENERAL@auckland.ac.nz",
  };
  await prisma.contactRecipient.createMany({
    data: ORIGINAL_INQUIRY_TYPES.map((t) => ({
      category: t.category,
      labelEn: t.category,
      labelZh: t.labelZh,
      order: t.order,
      email: recipientEmails[t.category] ?? "TODO_GENERAL@auckland.ac.nz",
    })),
  });

  await prisma.teamMember.createMany({
    data: [
      {
        name: "Dr Jennifer Miles Chan",
        title: "Managing Director",
        section: TeamSection.BoardOfDirectors,
        bio: "",
        photoPath: "/images/team/jennifer-miles-chan.jpeg",
        orcidId: "0000-0003-2050-7709",
        order: 1,
        isVisible: true,
      },
      {
        name: "Professor Sally Poppitt",
        title: "Founding Director",
        section: TeamSection.BoardOfDirectors,
        bio: "",
        photoPath: "/images/team/Sally-poppitt.png",
        orcidId: "0000-0002-2214-8378",
        order: 2,
        isVisible: true,
      },
      {
        name: "Professor Garth Cooper",
        title: "Co-Director",
        section: TeamSection.BoardOfDirectors,
        bio: "",
        photoPath: "/images/team/Garth-cooper.png",
        orcidId: "0000-0001-5241-3163",
        order: 3,
        isVisible: true,
      },
      {
        name: "Dr Ivana Sequeira",
        title: "Senior Lecturer",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/Ivana-sequeira.png",
        orcidId: "0000-0001-5414-9925",
        order: 1,
        isVisible: true,
      },
      {
        name: "Dr Louise Lu",
        title: "Research Fellow",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/louise-lu.png",
        orcidId: "0000-0001-5147-6007",
        order: 2,
        isVisible: true,
      },
      {
        name: "Mr Jack Penhaligan",
        title: "PhD Candidate",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/jack-penhaligan.png",
        orcidId: "0000-0001-8488-4138",
        order: 3,
        isVisible: true,
      },
      {
        name: "Ms Julia Cree",
        title: "PhD Candidate",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/julia-cree.png",
        orcidId: "0000-0002-3926-1510",
        order: 4,
        isVisible: true,
      },
      {
        name: "Mr Kok Hong Leiu",
        title: "PhD Candidate",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/kok-hong-leiu.png",
        orcidId: "0000-0002-1247-1403",
        order: 5,
        isVisible: true,
      },
      {
        name: "Ms Theresa Alipia",
        title: "PhD Candidate",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/theresa-alipia.png",
        order: 6,
        isVisible: true,
      },
      {
        name: "Dr William Zhu",
        title: "Research Nurse",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/william-zhu.jpg",
        order: 7,
        isVisible: true,
      },
      {
        name: "Ms Shakeela Jayasinghe",
        title: "HNU Administrator",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/shakeela-jayasinghe.jpeg",
        orcidId: "0000-0001-5121-1025",
        order: 8,
        isVisible: true,
      },
      {
        name: "Ms Natalie Radich",
        title: "HNU Administrator",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/no-team-member-picture.png",
        orcidId: "0009-0009-5769-2996",
        order: 9,
        isVisible: true,
      },
      {
        name: "Mr Saril Vaid",
        title: "Metabolic Cook",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/no-team-member-picture.png",
        order: 10,
        isVisible: true,
      },
      {
        name: "Ms Niamh Brennan",
        title: "Research Assistant",
        section: TeamSection.ResearchTeam,
        bio: "",
        photoPath: "/images/team/no-team-member-picture.png",
        order: 11,
        isVisible: true,
      },
    ],
  });

  await prisma.publicationCategory.createMany({
    data: [
      { name: "Metabolism", order: 1 },
      { name: "Clinical Trials", order: 2 },
      { name: "Nutrition", order: 3 },
    ],
  });

  const metabolismCategory = await prisma.publicationCategory.findUnique({
    where: { name: "Metabolism" },
  });
  const clinicalTrialsCategory = await prisma.publicationCategory.findUnique({
    where: { name: "Clinical Trials" },
  });
  const nutritionCategory = await prisma.publicationCategory.findUnique({
    where: { name: "Nutrition" },
  });

  const jennifer = await getTeamMemberByName("Dr Jennifer Miles Chan");
  const sally = await getTeamMemberByName("Professor Sally Poppitt");

  if (!metabolismCategory || !clinicalTrialsCategory || !nutritionCategory) {
    throw new Error("Publication categories were not created correctly.");
  }
  if (!jennifer || !sally) {
    throw new Error("Required team members for publication seed were not found.");
  }

  const publication1 = await prisma.publication.create({
    data: {
      title: "Sample HNU Publication: Dietary interventions and metabolic health outcomes",
      authorsRaw: "Jennifer Miles-Chan, Sally Poppitt",
      journal: "Journal of Human Nutrition Research",
      year: 2026,
      pubType: "Journal Article",
      url: "https://example.com/publication-1",
      abstract:
        "This sample publication record is seeded locally to test the HNU research archive page and publication card layout.",
      affiliation: "Human Nutrition Unit, University of Auckland",
      sourceType: "SEED",
      sourceId: "seed-publication-1",
      orcidSource: "0000-0003-0313-7048",
      status: "Pending",
      isVisible: true,
      hiddenManually: false,
      matchedKeywords: "dietary, metabolic, nutrition",
      lastSyncedAt: new Date(),
      categoryId: metabolismCategory.id,
    },
  });

  const publication2 = await prisma.publication.create({
    data: {
      title: "Sample HNU Publication: Nutrition trial design in controlled residential settings",
      authorsRaw: "Jennifer Miles-Chan",
      journal: "Clinical Nutrition Methods",
      year: 2025,
      pubType: "Review",
      url: "https://example.com/publication-2",
      abstract:
        "This is a second sample publication used to verify filtering, ordering, and rendering on the research page.",
      affiliation: "Human Nutrition Unit, University of Auckland",
      sourceType: "SEED",
      sourceId: "seed-publication-2",
      orcidSource: "0000-0003-0313-7048",
      status: "Pending",
      isVisible: true,
      hiddenManually: false,
      matchedKeywords: "trial, nutrition, residential",
      lastSyncedAt: new Date(),
      categoryId: clinicalTrialsCategory.id,
    },
  });

  const publication3 = await prisma.publication.create({
    data: {
      title: "Sample HNU Publication: Appetite regulation and body composition in nutrition studies",
      authorsRaw: "Sally Poppitt",
      journal: "Nutrition and Metabolism Review",
      year: 2024,
      pubType: "Journal Article",
      url: "https://example.com/publication-3",
      abstract:
        "This sample publication helps test multiple years, categories, and author display in the publications archive.",
      affiliation: "Human Nutrition Unit, University of Auckland",
      sourceType: "SEED",
      sourceId: "seed-publication-3",
      status: "Pending",
      isVisible: true,
      hiddenManually: false,
      matchedKeywords: "appetite, body composition, nutrition",
      lastSyncedAt: new Date(),
      categoryId: nutritionCategory.id,
    },
  });

  await prisma.publicationAuthor.createMany({
    data: [
      { publicationId: publication1.id, teamMemberId: jennifer.id, order: 1 },
      { publicationId: publication1.id, teamMemberId: sally.id, order: 2 },
      { publicationId: publication2.id, teamMemberId: jennifer.id, order: 1 },
      { publicationId: publication3.id, teamMemberId: sally.id, order: 1 },
    ],
  });

  await prisma.partnerLogo.createMany({
    data: PARTNER_LOGOS.map((partner, index) => ({
      name: partner.name,
      logoPath: partner.logoPath,
      websiteUrl: "",
      isPlaceholder: false,
      group: partner.group,
      order: index + 1,
    })),
  });

  // Seed the singleton relevance-filter config the ORCID sync reads. Lists are
  // stored as newline-separated text (SQLite has no array type) and share their
  // defaults with src/lib/publication-filter.ts so there's one source of truth.
  await prisma.publicationFilterSetting.create({
    data: {
      minYear: DEFAULT_MIN_YEAR,
      affiliationPhrases: DEFAULT_AFFILIATION_PHRASES.join("\n"),
      institutionRors: DEFAULT_INSTITUTION_RORS.join("\n"),
      strongKeywords: DEFAULT_STRONG_KEYWORDS.join("\n"),
      weakKeywords: DEFAULT_WEAK_KEYWORDS.join("\n"),
      exclusionKeywords: DEFAULT_EXCLUSION_KEYWORDS.join("\n"),
      routeUnitAffiliation: DEFAULT_ROUTES.unitAffiliation,
      routeInstitutionKeyword: DEFAULT_ROUTES.institutionKeyword,
      routeStrongKeywords: DEFAULT_ROUTES.strongKeywords,
      routeWeakMatch: DEFAULT_ROUTES.weakMatch,
      routeExclusion: DEFAULT_ROUTES.exclusion,
      routeNoSignal: DEFAULT_ROUTES.noSignal,
    },
  });

  // Populate the page-builder blocks (preserves any existing blocks).
  await seedPageBlocks(prisma);

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
