// Admin dashboard summary endpoint: GET returns aggregate record counts
// (studies, team members, partners, publications, pending publications, contact
// submissions) for the admin overview cards. Counts run in a single Promise.all
// batch; on any DB failure it responds 500 with a generic error message.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      studies,
      teamMembers,
      partners,
      publications,
      pendingPublications,
      contactSubmissions,
    ] = await Promise.all([
      prisma.study.count(),
      prisma.teamMember.count(),
      prisma.partnerLogo.count(),
      prisma.publication.count(),
      prisma.publication.count({ where: { status: "Pending" } }),
      prisma.contactSubmission.count(),
    ]);

    return NextResponse.json({
      studies,
      teamMembers,
      partners,
      publications,
      pendingPublications,
      contactSubmissions,
    });
  } catch (error) {
    console.error("GET /api/admin/stats failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats." },
      { status: 500 },
    );
  }
}
