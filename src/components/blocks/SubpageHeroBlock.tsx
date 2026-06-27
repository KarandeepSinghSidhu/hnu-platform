import { Fragment } from "react";
import SubpageHero from "@/components/layout/SubpageHero";

// Renders a SubpageHero from editable block content. The subtitle is stored as a
// plain string; each newline becomes a <br /> so editors can manage line breaks
// without writing JSX.
export default function SubpageHeroBlock({
  title,
  subtitle = "",
  subtitleMaxWidth,
}: {
  title: string;
  subtitle?: string;
  subtitleMaxWidth?: string | number;
}) {
  const lines = subtitle.split("\n");
  const subtitleNode = lines.map((line, i) => (
    <Fragment key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </Fragment>
  ));

  const parsedWidth =
    subtitleMaxWidth === "" || subtitleMaxWidth == null
      ? undefined
      : Number(subtitleMaxWidth);

  return (
    <SubpageHero
      title={title}
      subtitle={subtitleNode}
      subtitleMaxWidth={
        parsedWidth !== undefined && Number.isFinite(parsedWidth)
          ? parsedWidth
          : undefined
      }
    />
  );
}
