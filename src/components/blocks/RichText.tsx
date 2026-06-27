import type { CSSProperties } from "react";
import { sanitizeRichHtml } from "@/lib/sanitize";

/**
 * Renders admin-authored rich text. Sanitizes on every render (defense in depth
 * against stored XSS) before injecting HTML. Server component, so the sanitizer
 * never ships to the client. The parent supplies typography via className/style;
 * the injected <p>/<ul>/<a> inherit colour, font size and line height, and the
 * container's flex/space utilities control inter-block spacing — so a converted
 * paragraph array renders identically to the original mapped <p> elements.
 */
export default function RichText({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: CSSProperties;
}) {
  const clean = sanitizeRichHtml(html);
  if (!clean) return null;
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
