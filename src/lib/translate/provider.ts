// Provider-agnostic machine-translation client. Server-only (uses fetch + env
// secrets; never import from a client component).
//
// The active provider is chosen by env `TRANSLATE_PROVIDER` (default "azure").
// Auth via `TRANSLATE_API_KEY`. Azure also reads `TRANSLATE_REGION`. An optional
// `TRANSLATE_ENDPOINT` overrides the default host (useful for tests / proxies).
//
// Swapping providers is a one-liner via env; all three speak the same interface.
// Only Azure (the configured default, 2M chars/month free F0 tier) is exercised
// in this project — Google/DeepL are kept ready and follow each vendor's REST
// shape, but are unverified until their key is supplied.

export type TargetLang = "ZH";
export type TranslateFormat = "text" | "html";

export interface TranslateRequest {
  texts: string[];
  targetLang: TargetLang;
  format: TranslateFormat;
}

export interface TranslationProvider {
  readonly name: string;
  /** Translates `texts`, returning results in the same order and length. */
  translate(req: TranslateRequest): Promise<string[]>;
}

// Per-vendor BCP-47 codes for our target(s). Simplified Chinese to match the
// site's existing zh.ts dictionary.
const LANG = {
  azure: { ZH: "zh-Hans" },
  google: { ZH: "zh-CN" },
  deepl: { ZH: "ZH" },
} as const;

class AzureProvider implements TranslationProvider {
  readonly name = "azure";
  constructor(
    private readonly key: string,
    private readonly region: string,
    private readonly endpoint: string,
  ) {}

  async translate({ texts, targetLang, format }: TranslateRequest): Promise<string[]> {
    if (texts.length === 0) return [];
    const url = new URL("/translate", this.endpoint);
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("to", LANG.azure[targetLang]);
    if (format === "html") url.searchParams.set("textType", "html");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.key,
        // Required for regional resources; harmless/optional for "Global".
        ...(this.region ? { "Ocp-Apim-Subscription-Region": this.region } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts.map((t) => ({ Text: t }))),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Azure translate ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as { translations: { text: string }[] }[];
    return texts.map((t, i) => data[i]?.translations?.[0]?.text ?? t);
  }
}

class GoogleProvider implements TranslationProvider {
  readonly name = "google";
  constructor(
    private readonly key: string,
    private readonly endpoint: string,
  ) {}

  async translate({ texts, targetLang, format }: TranslateRequest): Promise<string[]> {
    if (texts.length === 0) return [];
    const url = new URL("/language/translate/v2", this.endpoint);
    url.searchParams.set("key", this.key);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, target: LANG.google[targetLang], format }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google translate ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      data?: { translations?: { translatedText: string }[] };
    };
    const out = data.data?.translations ?? [];
    return texts.map((t, i) => out[i]?.translatedText ?? t);
  }
}

class DeepLProvider implements TranslationProvider {
  readonly name = "deepl";
  constructor(
    private readonly key: string,
    private readonly endpoint: string,
  ) {}

  async translate({ texts, targetLang, format }: TranslateRequest): Promise<string[]> {
    if (texts.length === 0) return [];
    const url = new URL("/v2/translate", this.endpoint);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts,
        target_lang: LANG.deepl[targetLang],
        ...(format === "html" ? { tag_handling: "html" } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`DeepL translate ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as { translations?: { text: string }[] };
    const out = data.translations ?? [];
    return texts.map((t, i) => out[i]?.text ?? t);
  }
}

/**
 * Builds the configured provider, or `null` when no API key is set. A null
 * provider means cache-warming is skipped; the public render still works (it
 * reads the cache and falls back to English for anything uncached).
 */
export function getProvider(): TranslationProvider | null {
  const key = process.env.TRANSLATE_API_KEY?.trim();
  if (!key) return null;
  const name = (process.env.TRANSLATE_PROVIDER || "azure").trim().toLowerCase();
  const endpointOverride = process.env.TRANSLATE_ENDPOINT?.trim();
  switch (name) {
    case "azure":
      return new AzureProvider(
        key,
        process.env.TRANSLATE_REGION?.trim() || "",
        endpointOverride || "https://api.cognitive.microsofttranslator.com",
      );
    case "google":
      return new GoogleProvider(
        key,
        endpointOverride || "https://translation.googleapis.com",
      );
    case "deepl":
      return new DeepLProvider(key, endpointOverride || "https://api-free.deepl.com");
    default:
      throw new Error(`Unknown TRANSLATE_PROVIDER "${name}" (expected azure|google|deepl)`);
  }
}
