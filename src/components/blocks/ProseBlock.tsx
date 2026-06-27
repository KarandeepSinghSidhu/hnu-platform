import RichText from "@/components/blocks/RichText";

// A generic rich-text section: an optional heading plus a sanitized rich-text
// body in a comfortable reading column. Content-neutral building block — the
// admin supplies all copy. Renders nothing when empty (RichText returns null on
// empty HTML), so a freshly-inserted block never breaks the page.
export default function ProseBlock({
  heading,
  body,
  align = "left",
}: {
  heading?: string;
  body?: string;
  align?: "left" | "center";
}) {
  const hasHeading = Boolean(heading && heading.trim());
  const alignClass = align === "center" ? "text-center" : "text-left";
  // Centre-aligned lists look wrong hanging off a left margin, so move the
  // markers inside the text flow only in that case.
  const listInside =
    align === "center" ? "[&_ul]:list-inside [&_ol]:list-inside" : "";
  return (
    <section className="@container w-full bg-white px-6 py-10 sm:px-12 @5xl:px-45">
      <div className={`mx-auto max-w-[760px] ${alignClass}`}>
        {hasHeading && (
          <h2
            className="mb-5 text-2xl font-bold text-[#0c0c48] sm:text-3xl"
            style={{ fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.2 }}
          >
            {heading}
          </h2>
        )}
        <RichText
          html={body ?? ""}
          className={`flex flex-col gap-4 text-[#0c0c48]/85 [&_a]:text-[#0a4379] [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 ${listInside}`}
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "16px",
            lineHeight: 1.7,
          }}
        />
      </div>
    </section>
  );
}
