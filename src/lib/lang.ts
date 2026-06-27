// Server-side reader for the visitor's selected language.
//
// The language toggle (src/contexts/LanguageContext.tsx) persists the choice in
// a `lang` cookie ("EN" | "ZH"). Server Components read it here so they can
// render localized content; the client toggle calls router.refresh() so the
// server re-renders against the new cookie. Reading a cookie opts a route into
// dynamic rendering — fine here, since the public pages are already
// `export const dynamic = "force-dynamic"`.

import { cookies } from "next/headers";

export type Lang = "EN" | "ZH";

export const LANG_COOKIE = "lang";

/** Reads the `lang` cookie. Defaults to English when unset or unrecognized. */
export async function getServerLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "ZH" ? "ZH" : "EN";
}
