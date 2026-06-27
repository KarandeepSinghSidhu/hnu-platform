"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatStudyDate } from "@/lib/format-study-date";

type Lang = "en" | "zh";

interface StudyPdfRecord {
  id: number;
  title: string;
  fileName: string;
}

interface StudyContentProps {
  fullDescriptionEn: string;
  fullDescriptionZh: string;
  eligibilityEn: string;
  eligibilityZh: string;
  compensationEn: string;
  compensationZh: string;
  redcapUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneZh: string;
  ethicsStatement: string;
  status: string;
  publishedAt: string | null;
  pdfs: StudyPdfRecord[];
}

const STATUS_STYLES: Record<string, { dot: string; label: { en: string; zh: string } }> = {
  Recruiting: { dot: "#1a7f37", label: { en: "Recruiting", zh: "招募中" } },
  Active: { dot: "#0a4479", label: { en: "Active", zh: "进行中" } },
  Completed: { dot: "#8e8d8d", label: { en: "Completed", zh: "已结束" } },
};

export default function StudyContent({
  fullDescriptionEn,
  fullDescriptionZh,
  eligibilityEn,
  eligibilityZh,
  compensationEn,
  compensationZh,
  redcapUrl,
  contactEmail,
  contactPhone,
  contactPhoneZh,
  ethicsStatement,
  status,
  publishedAt,
  pdfs,
}: StudyContentProps) {
  // Single global toggle (Navbar) drives the study-page language too.
  const { lang: globalLang, setLang: setGlobalLang } = useLanguage();
  const lang: Lang = globalLang === "ZH" ? "zh" : "en";
  const setLang = (next: Lang) => setGlobalLang(next === "zh" ? "ZH" : "EN");

  const description = lang === "en" ? fullDescriptionEn : fullDescriptionZh;
  const eligibility = (lang === "en" ? eligibilityEn : eligibilityZh)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const compensation = lang === "en" ? compensationEn : compensationZh;
  const phone = lang === "en" ? contactPhone : contactPhoneZh;

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.Completed;

  const deadlineDisplay = publishedAt
    ? formatStudyDate(publishedAt, lang)
    : null;

  return (
    <section className="relative w-full bg-white py-10 sm:py-16 px-6 sm:px-12 lg:px-[45px] overflow-hidden">
      {/* Top row: status pill + deadline pill + language toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-[#0c0c48]"
          style={{ border: "1.5px solid #0c0c48" }}
          aria-label={`Status: ${statusStyle.label[lang]}`}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: statusStyle.dot }}
          />
          {statusStyle.label[lang]}
        </div>

        {deadlineDisplay && (
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm text-[#0c0c48]"
            style={{ border: "1.5px solid #0c0c48" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0c0c48"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {deadlineDisplay}
          </div>
        )}

        <div
          className="ml-auto flex gap-2"
          role="group"
          aria-label="Language"
        >
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

      {/* Two-column main layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Left — content */}
        <div className="flex-1 bg-white rounded-[20px] shadow-[0_0_20px_rgba(0,0,0,0.08)] p-8 lg:p-10">
          <div className="text-[#1f2937] text-base lg:text-[17px] leading-[1.8] space-y-5">
            <p className="whitespace-pre-wrap">{description}</p>

            <h2 className="text-[#0c0c48] text-xl lg:text-2xl font-bold pt-3">
              {lang === "en" ? "What you'll receive" : "参与补偿"}
            </h2>
            <p className="whitespace-pre-wrap">{compensation}</p>

            {pdfs.length > 0 && (
              <>
                <h2 className="text-[#0c0c48] text-xl lg:text-2xl font-bold pt-3">
                  {lang === "en" ? "Downloads" : "下载资料"}
                </h2>
                <ul className="flex flex-col gap-2 list-none p-0 m-0">
                  {pdfs.map((pdf) => (
                    <li key={pdf.id}>
                      <a
                        href={`/api/studies/pdf/${pdf.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#0a4479] hover:underline font-semibold"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <polyline points="9 15 12 18 15 15" />
                        </svg>
                        {pdf.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2 className="text-[#0c0c48] text-xl lg:text-2xl font-bold pt-3">
              {lang === "en" ? "Contact" : "联系方式"}
            </h2>
            <p>
              <span className="font-semibold">
                {lang === "en" ? "Email: " : "电子邮箱："}
              </span>
              <a
                href={`mailto:${contactEmail}`}
                className="text-[#1f2bd4] hover:underline"
              >
                {contactEmail}
              </a>
            </p>
            <p>
              <span className="font-semibold">
                {lang === "en" ? "Phone: " : "电话："}
              </span>
              {phone}
            </p>

            <p className="text-[#8e8d8d] text-sm leading-relaxed pt-6 border-t border-[#e5e5e5]">
              <span className="font-semibold">
                {lang === "en" ? "Ethics: " : "伦理审批："}
              </span>
              {ethicsStatement}
            </p>
          </div>
        </div>

        {/* Right — eligibility + join */}
        <aside className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-6">
          {/* Eligibility */}
          <div
            className="rounded-2xl p-6 bg-white"
            style={{ border: "2px solid #0c0c48" }}
          >
            <h2 className="text-[#0c0c48] text-lg font-bold mb-4">
              {lang === "en" ? "Eligibility" : "纳入条件"}
            </h2>
            <ul className="flex flex-col gap-3 list-none p-0">
              {eligibility.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[#374151] leading-snug"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-[#0c0c48] flex-shrink-0 mt-2"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Join now (REDCap) */}
          <a
            href={redcapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-2xl py-6 text-xl font-semibold text-[#0c0c48] bg-white hover:bg-[#0c0c48] hover:text-white transition-colors"
            style={{ border: "2px solid #0c0c48" }}
            aria-label={
              lang === "en" ? "Join the study via REDCap" : "通过 REDCap 报名"
            }
          >
            {lang === "en" ? "Join now" : "立即报名"}
          </a>

          <Link
            href="/contact"
            className="text-center text-sm text-[#0c0c48] underline hover:opacity-70 transition-opacity"
          >
            {lang === "en" ? "Have questions? Contact us" : "有问题？联系我们"}
          </Link>

          <p className="text-[#8e8d8d] text-xs leading-relaxed">
            {lang === "en"
              ? "You will be redirected to REDCap, the University's secure questionnaire system. HNU does not collect personal health information on this website."
              : "您将被重定向至 REDCap，奥克兰大学的安全问卷系统。HNU 不会在本网站收集个人健康信息。"}
          </p>
        </aside>
      </div>
    </section>
  );
}
