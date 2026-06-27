// Public read-only API route for team members.
// GET → the full team dataset (via getTeamData); no auth required.
// On any data-layer failure it logs server-side and returns a generic 500
// without leaking error details to the client.
import { NextResponse } from "next/server";
import { getTeamData } from "@/lib/data/team";

export async function GET() {
  try {
    const teamData = await getTeamData();
    return NextResponse.json(teamData);
  } catch (error) {
    console.error("GET /api/team failed:", error);

    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 },
    );
  }
}
