"use client";

import Link from "next/link";
import SectionHeading from "@/components/sections/SectionHeading";
import { readRowContent } from "@/lib/blocks/row";
import { formatStudyDate } from "@/lib/format-study-date";
import { useStudy, type StudyLang } from "./study-context";

const STATUS_STYLES: Record<
  string,
  { dot: string; label: { en: string; zh: string } }
> = {
  Recruiting: { dot: "#1a7f37", label: { en: "Recruiting", zh: "招募中" } },
  Active: { dot: "#0a4479", label: { en: "Active", zh: "进行中" } },
  Completed: { dot: "#8e8d8d", label: { en: "Completed", zh: "已结束" } },
};

const CARD = "bg-white rounded-[20px] shadow-[0_0_20px_rgba(0,0,0,0.08)] p-8 lg:p-10";

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function pick(en: string, zh: string, lang: StudyLang): string {
  return lang === "en" ? en : zh;
}

function StudyStatusBar() {
  const { study, lang, setLang } = useStudy();
  const statusStyle = STATUS_STYLES[study.status] || STATUS_STYLES.Completed;
  const deadline = study.publishedAt
    ? formatStudyDate(study.publishedAt, lang)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-[#0c0c48]"
        style={{ border: "1.5px solid #0c0c48" }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: statusStyle.dot }}
        />
        {statusStyle.label[lang]}
      </div>
      {deadline && (
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm text-[#0c0c48]"
          style={{ border: "1.5px solid #0c0c48" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c0c48" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {deadline}
        </div>
      )}
      <div className="ml-auto flex gap-2" role="group" aria-label="Language">
        <button
          type="button"
          aria-pressed={lang === "en"}
          onClick={() => setLang("en")}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            lang === "en"
              ? "bg-[#0c0c48] text-white"
              : "border border-[#0c0c48] text-[#0c0c48] hover:bg-[#0c0c48]/10"
          }`}
        >
          English
        </button>
        <button
          type="button"
          aria-pressed={lang === "zh"}
          onClick={() => setLang("zh")}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            lang === "zh"
              ? "bg-[#0c0c48] text-white"
              : "border border-[#0c0c48] text-[#0c0c48] hover:bg-[#0c0c48]/10"
          }`}
        >
          中文
        </button>
      </div>
    </div>
  );
}

function StudyDescription() {
  const { study, lang } = useStudy();
  return (
    <div className={CARD}>
      <p className="whitespace-pre-wrap text-[#1f2937] text-base lg:text-[17px] leading-[1.8]">
        {pick(study.fullDescriptionEn, study.fullDescriptionZh, lang)}
      </p>
    </div>
  );
}

function StudyCompensation() {
  const { study, lang } = useStudy();
  return (
    <div className={CARD}>
      <h2 className="text-[#0c0c48] text-xl lg:text-2xl font-bold mb-4">
        {lang === "en" ? "What you'll receive" : "参与补偿"}
      </h2>
      <p className="whitespace-pre-wrap text-[#1f2937] text-base lg:text-[17px] leading-[1.8]">
        {pick(study.compensationEn, study.compensationZh, lang)}
      </p>
    </div>
  );
}

function StudyEligibility() {
  const { study, lang } = useStudy();
  const items = splitLines(pick(study.eligibilityEn, study.eligibilityZh, lang));
  return (
    <div className="rounded-2xl p-6 bg-white" style={{ border: "2px solid #0c0c48" }}>
      <h2 className="text-[#0c0c48] text-lg font-bold mb-4">
        {lang === "en" ? "Eligibility" : "纳入条件"}
      </h2>
      <ul className="flex flex-col gap-3 list-none p-0 m-0">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#374151] leading-snug">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0c0c48] flex-shrink-0 mt-2" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StudyJoinButton() {
  const { study, lang } = useStudy();
  return (
    <div className="flex flex-col gap-4">
      <a
        href={study.redcapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center rounded-2xl py-6 text-xl font-semibold text-[#0c0c48] bg-white hover:bg-[#0c0c48] hover:text-white transition-colors"
        style={{ border: "2px solid #0c0c48" }}
      >
        {lang === "en" ? "Join now" : "立即报名"}
      </a>
      <p className="text-[#8e8d8d] text-xs leading-relaxed">
        {lang === "en"
          ? "You will be redirected to REDCap, the University's secure questionnaire system. HNU does not collect personal health information on this website."
          : "您将被重定向至 REDCap，奥克兰大学的安全问卷系统。HNU 不会在本网站收集个人健康信息。"}
      </p>
    </div>
  );
}

function StudyContact() {
  const { study, lang } = useStudy();
  const phone = lang === "en" ? study.contactPhone : study.contactPhoneZh;
  return (
    <div className="text-[#1f2937] text-base leading-[1.8] space-y-2">
      <h2 className="text-[#0c0c48] text-xl lg:text-2xl font-bold">
        {lang === "en" ? "Contact" : "联系方式"}
      </h2>
      <p>
        <span className="font-semibold">{lang === "en" ? "Email: " : "电子邮箱："}</span>
        <a href={`mailto:${study.contactEmail}`} className="text-[#1f2bd4] hover:underline">
          {study.contactEmail}
        </a>
      </p>
      <p>
        <span className="font-semibold">{lang === "en" ? "Phone: " : "电话："}</span>
        {phone}
      </p>
      <Link href="/contact" className="inline-block text-sm text-[#0c0c48] underline hover:opacity-70">
        {lang === "en" ? "Have questions? Contact us" : "有问题？联系我们"}
      </Link>
    </div>
  );
}

function StudyEthics() {
  const { study, lang } = useStudy();
  return (
    <p className="text-[#8e8d8d] text-sm leading-relaxed pt-6 border-t border-[#e5e5e5]">
      <span className="font-semibold">{lang === "en" ? "Ethics: " : "伦理审批："}</span>
      {study.ethicsStatement}
    </p>
  );
}

function StudyPdfs() {
  const { study, lang } = useStudy();
  if (study.pdfs.length === 0) return null;
  return (
    <div className={CARD}>
      <h2 className="text-[#0c0c48] text-xl lg:text-2xl font-bold mb-4">
        {lang === "en" ? "Downloads" : "下载资料"}
      </h2>
      <ul className="flex flex-col gap-2 list-none p-0 m-0">
        {study.pdfs.map((pdf) => (
          <li key={pdf.id}>
            <a
              href={`/api/studies/pdf/${pdf.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#0a4479] hover:underline font-semibold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {pdf.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Free-text / prose section. Its body is rich-text HTML, sanitized server-side
// before it reaches this client component (see resolve-study-layout).
function StudyProse({ content }: { content: Record<string, unknown> }) {
  const { lang } = useStudy();
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const heading =
    lang === "zh"
      ? s(content.headingZh) || s(content.heading)
      : s(content.heading);
  const body =
    lang === "zh" ? s(content.bodyZh) || s(content.body) : s(content.body);
  if (!heading && !body) return null;
  return (
    <div className={CARD}>
      {heading && (
        <h2 className="text-[#0c0c48] text-xl lg:text-2xl font-bold mb-4">
          {heading}
        </h2>
      )}
      {body && (
        <div
          className="text-[#1f2937] text-base lg:text-[17px] leading-[1.8] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_a]:text-[#1f2bd4] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      )}
    </div>
  );
}

function RowBlock({ content }: { content: Record<string, unknown> }) {
  const { columns, widths } = readRowContent(content);

  if (columns.length === 1) {
    return (
      <div className="flex flex-col gap-6">
        {columns[0].map((child) => (
          <StudyBlockRenderer key={child.id} type={child.type} content={child.content} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {columns.map((col, i) => (
        <div
          key={i}
          className="flex min-w-0 w-full flex-col gap-6 lg:w-auto"
          style={{ flexGrow: widths[i], flexBasis: 0 }}
        >
          {col.map((child) => (
            <StudyBlockRenderer key={child.id} type={child.type} content={child.content} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Renders a single study-layout block. Rows recurse into their children, but a
// row child that is itself a row is ignored (one level of nesting only).
export default function StudyBlockRenderer({
  type,
  content,
}: {
  type: string;
  content: Record<string, unknown>;
}) {
  switch (type) {
    case "studyStatusBar":
      return <StudyStatusBar />;
    case "studyDescription":
      return <StudyDescription />;
    case "studyCompensation":
      return <StudyCompensation />;
    case "studyEligibility":
      return <StudyEligibility />;
    case "studyJoinButton":
      return <StudyJoinButton />;
    case "studyContact":
      return <StudyContact />;
    case "studyEthics":
      return <StudyEthics />;
    case "studyPdfs":
      return <StudyPdfs />;
    case "studyProse":
      return <StudyProse content={content} />;
    case "studyHero":
      // Rendered by StudyLayoutView as the full-width page hero.
      return null;
    case "sectionHeading":
      return (
        <SectionHeading
          text={typeof content.text === "string" ? content.text : ""}
          heightClass={
            typeof content.heightClass === "string" ? content.heightClass : "h-32"
          }
        />
      );
    case "row":
      return <RowBlock content={content} />;
    default:
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[StudyBlockRenderer] Unknown block type: ${type}`);
      }
      return null;
  }
}
