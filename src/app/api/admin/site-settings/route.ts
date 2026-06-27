// Admin API for site-wide branding (favicon + light/dark logos) and the navbar
// donation link. GET returns the raw stored override values for the admin UI;
// POST uploads a replacement image, updates the donation URL, or resets a target
// back to its built-in default. Uploads are validated by MIME
// and extension (SVG banned, stored-XSS stance), saved under /public/uploads/branding
// with a timestamped name, and the previous file is cleaned up; the DB swap is
// transactional and the site-settings cache tag is purged so renders pick up the
// change immediately.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sanitizeFileName, tryRemoveFile } from "@/lib/media-upload";
import { DEFAULT_DONATE_URL } from "@/lib/branding";
import {
  getRawSiteSettings,
  SITE_SETTINGS_CACHE_TAG,
} from "@/lib/site-settings";

export const runtime = "nodejs";

// Branding uploads live under /public/uploads/branding; this is also the guard
// prefix passed to tryRemoveFile so a delete can never escape that directory.
const BRANDING_UPLOAD_DIR = "uploads/branding";

const MB = 1024 * 1024;

type Target = "favicon" | "logoLight" | "logoDark";
type Column = "faviconPath" | "logoLightPath" | "logoDarkPath";

// Per-target upload policy in one place (column, size cap, accepted types, and
// the canonical stored extension by MIME). SVG stays banned for uploads
// (stored-XSS stance shared with media uploads); the committed default logo IS
// an SVG, but resets restore it — uploads can't introduce new ones. Favicons
// additionally accept .ico, whose MIME is browser-inconsistent, so we also map
// by filename extension.
const TARGET_CONFIG: Record<
  Target,
  {
    column: Column;
    rejectMessage: string;
    maxSize: number;
    extByMime: Record<string, string>;
    extByName: RegExp;
  }
> = {
  favicon: {
    column: "faviconPath",
    rejectMessage: "Favicon must be a PNG or ICO file.",
    maxSize: 1 * MB,
    extByMime: {
      "image/png": "png",
      "image/x-icon": "ico",
      "image/vnd.microsoft.icon": "ico",
    },
    extByName: /\.(png|ico)$/i,
  },
  logoLight: {
    column: "logoLightPath",
    rejectMessage: "Logo must be a PNG or WebP file.",
    maxSize: 5 * MB,
    extByMime: { "image/png": "png", "image/webp": "webp" },
    extByName: /\.(png|webp)$/i,
  },
  logoDark: {
    column: "logoDarkPath",
    rejectMessage: "Logo must be a PNG or WebP file.",
    maxSize: 5 * MB,
    extByMime: { "image/png": "png", "image/webp": "webp" },
    extByName: /\.(png|webp)$/i,
  },
};

function parseTarget(value: FormDataEntryValue | null): Target | null {
  return value === "favicon" || value === "logoLight" || value === "logoDark"
    ? value
    : null;
}

// Canonical stored extension: prefer the validated MIME, fall back to a valid
// filename extension. Returns null when neither identifies an accepted image —
// the upload is rejected rather than stored with a non-image extension (which
// would be served as octet-stream and render as a broken image).
function resolveExtension(
  file: File,
  cfg: (typeof TARGET_CONFIG)[Target],
): string | null {
  const byMime = cfg.extByMime[file.type.toLowerCase()];
  if (byMime) return byMime;
  const match = cfg.extByName.exec(file.name);
  return match ? match[1].toLowerCase() : null;
}

async function saveBrandingFile(file: File, ext: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", BRANDING_UPLOAD_DIR);
  await mkdir(uploadDir, { recursive: true });

  // Timestamped name: collision-free, and a fresh URL each upload busts the
  // browser's (aggressive) favicon cache. The extension is always the canonical
  // one derived from the validated type, so the file is served as an image
  // even if the original upload had a missing or misleading extension.
  const base =
    sanitizeFileName(file.name).replace(/\.[^.]*$/, "") || "branding";
  const safeFileName = `${Date.now()}-${base}.${ext}`;
  await writeFile(
    path.join(uploadDir, safeFileName),
    Buffer.from(await file.arrayBuffer()),
  );
  return `/${BRANDING_UPLOAD_DIR}/${safeFileName}`;
}

// The navbar "Donations" link is a text setting (not a file). Validate it as an
// http(s) URL so a stored value can't smuggle a javascript:/data: scheme into an
// href; empty (reset) restores the built-in default at read time.
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function saveDonateUrl(formData: FormData) {
  const reset = formData.get("reset") === "true";
  let donateUrl = "";
  if (!reset) {
    const raw = formData.get("value");
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (!trimmed) {
      return NextResponse.json(
        { error: "Enter a donation link (or reset to default)." },
        { status: 400 },
      );
    }
    if (trimmed.length > 2048 || !isHttpUrl(trimmed)) {
      return NextResponse.json(
        { error: "Donation link must be a valid http(s) URL." },
        { status: 400 },
      );
    }
    // Saving the current built-in default is the same as resetting — store ""
    // so the UI keeps showing it as the default (and Reset stays meaningful).
    donateUrl = trimmed === DEFAULT_DONATE_URL ? "" : trimmed;
  }

  const updated = await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, donateUrl },
    update: { donateUrl },
  });
  revalidateTag(SITE_SETTINGS_CACHE_TAG, { expire: 0 });
  return NextResponse.json(
    {
      faviconPath: updated.faviconPath,
      logoLightPath: updated.logoLightPath,
      logoDarkPath: updated.logoDarkPath,
      donateUrl: updated.donateUrl,
    },
    { status: 200 },
  );
}

/** Raw stored values ("" = built-in default) for the admin UI. */
export async function GET() {
  try {
    const settings = await getRawSiteSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/site-settings failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch site settings." },
      { status: 500 },
    );
  }
}

/**
 * Upload or reset one branding asset. Multipart form fields:
 * - target: "favicon" | "logoLight" | "logoDark"
 * - file:   the replacement image (omit when resetting)
 * - reset:  "true" to clear the override back to the built-in default
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // The donation link is a text field, not a file upload — handle it before
    // the image-target logic.
    if (formData.get("target") === "donateUrl") {
      return await saveDonateUrl(formData);
    }

    const target = parseTarget(formData.get("target"));
    if (!target) {
      return NextResponse.json(
        { error: "target must be favicon, logoLight, or logoDark." },
        { status: 400 },
      );
    }
    const cfg = TARGET_CONFIG[target];
    const reset = formData.get("reset") === "true";
    const file = formData.get("file");

    let newPath = "";
    if (!reset) {
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "file is required (or pass reset=true)." },
          { status: 400 },
        );
      }
      if (file.size > cfg.maxSize) {
        return NextResponse.json(
          { error: `File must be under ${Math.round(cfg.maxSize / MB)}MB.` },
          { status: 400 },
        );
      }
      const ext = resolveExtension(file, cfg);
      if (!ext) {
        return NextResponse.json({ error: cfg.rejectMessage }, { status: 400 });
      }
      newPath = await saveBrandingFile(file, ext);
    }

    let updated;
    try {
      // Read the previous path and write the new one atomically so concurrent
      // saves can't interleave the read with the write.
      const [previous, result] = await prisma.$transaction([
        prisma.siteSettings.findUnique({ where: { id: 1 } }),
        prisma.siteSettings.upsert({
          where: { id: 1 },
          create: { id: 1, [cfg.column]: newPath },
          update: { [cfg.column]: newPath },
        }),
      ]);
      updated = result;

      // Clean up the file the old value pointed at (no-op for defaults/"" and
      // for anything outside the branding dir).
      const previousPath = previous?.[cfg.column] ?? "";
      if (previousPath && previousPath !== newPath) {
        await tryRemoveFile(previousPath, BRANDING_UPLOAD_DIR);
      }
    } catch (dbError) {
      // The DB write failed after the file was saved — remove the orphan.
      if (newPath) await tryRemoveFile(newPath, BRANDING_UPLOAD_DIR);
      throw dbError;
    }

    // Next 16 tag invalidation: purge the unstable_cache entry behind
    // getSiteSettings so the next render serves the new branding immediately.
    revalidateTag(SITE_SETTINGS_CACHE_TAG, { expire: 0 });

    return NextResponse.json(
      {
        faviconPath: updated.faviconPath,
        logoLightPath: updated.logoLightPath,
        logoDarkPath: updated.logoDarkPath,
        donateUrl: updated.donateUrl,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/admin/site-settings failed:", error);
    return NextResponse.json(
      { error: "Failed to update site settings." },
      { status: 500 },
    );
  }
}
