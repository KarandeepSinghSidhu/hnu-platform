import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers";

// Host canonicalization (B08): 301 the temporary *.onrender.com host → the
// custom domain so SEO signals consolidate and visitors don't land on the temp
// URL. CANONICAL_HOST derives from the build-time NEXT_PUBLIC_SITE_URL, so the
// redirect activates only in the production build that has the custom domain;
// it is a no-op until that host is set AND differs from the onrender host, so
// *.onrender.com previews keep working pre-launch (no redirect loop).
const ONRENDER_HOST = process.env.RENDER_EXTERNAL_HOSTNAME;
// Tolerate a malformed NEXT_PUBLIC_SITE_URL by treating it as unset, so the
// redirect simply disables itself instead of throwing at config-evaluation time
// (which would stop the app from starting).
function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}
const CANONICAL_HOST = hostOf(process.env.NEXT_PUBLIC_SITE_URL);

const nextConfig: NextConfig = {
  // Serve images directly instead of through Next's on-the-fly optimizer.
  // The optimizer (sharp) OOMs on small hosts (e.g. Render's 512MB Starter) when
  // resizing large source images, which left collaboration/study card images
  // broken in production. Source images are kept reasonably sized at commit time,
  // so direct serving is fine here.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(),
      },
    ];
  },
  async redirects() {
    if (!ONRENDER_HOST || !CANONICAL_HOST || ONRENDER_HOST === CANONICAL_HOST) {
      return [];
    }
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: ONRENDER_HOST }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true, // 301
      },
    ];
  },
};

export default nextConfig;
