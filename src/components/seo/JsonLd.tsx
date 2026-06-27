import type { ReactElement } from "react";

// U+2028 (line separator) and U+2029 (paragraph separator) are valid inside JSON
// strings but are line terminators inside an inline <script>, where they throw a
// SyntaxError. Built from char codes so this source stays pure-ASCII.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

/**
 * Renders a JSON-LD structured-data <script>. Pure server component (emits no
 * client JS). The inline script is permitted by the production CSP
 * (`script-src 'unsafe-inline'`, see src/lib/security-headers.ts) and the data
 * is always app-authored (never user input), so injecting it is safe.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }): ReactElement {
  // Escape "<" (so a stray "</script>" in any value can't break out of the
  // element) and the U+2028/U+2029 separators (so they can't kill the script).
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .split(LINE_SEP)
    .join("\\u2028")
    .split(PARA_SEP)
    .join("\\u2029");
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
