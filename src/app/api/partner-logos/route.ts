// Public read-only API route for partner logos.
// GET → 200 with the full partner-logo list (via getPartnerLogos), or 500 on
// failure. No auth: this backs publicly rendered partner sections.
import { NextResponse } from "next/server";
import { getPartnerLogos } from "@/lib/data/partner-logos";

export async function GET() {
  try {
    const partnerLogos = await getPartnerLogos();
    return NextResponse.json(partnerLogos, { status: 200 });
  } catch (error) {
    console.error("GET /api/partner-logos failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner logos." },
      { status: 500 },
    );
  }
}
