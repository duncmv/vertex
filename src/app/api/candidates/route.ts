import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { scopeCandidatesToRequester } from "@/server/scope";

// GET /api/candidates — role-scoped candidate list (SRS FR-1.2, FR-2.3).
// A regional_recruiter sees only candidates they sourced; a
// country_supervisor sees their assigned country; in-house/director/admin
// see everything. Powers the /recruiter, /supervisor, and /management
// portal landing pages.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [
    "regional_recruiter",
    "country_supervisor",
    "inhouse_supervisor",
    "director",
    "admin",
  ]);
  if (guardRes) return guardRes;

  const scope = await scopeCandidatesToRequester(user!);

  const candidates = await prisma.candidate.findMany({
    where: scope,
    select: {
      id: true,
      source: true,
      lifecycle_status: true,
      nationality: true,
      created_at: true,
      user: { select: { full_name: true, email: true } },
      recruiter: { select: { id: true, full_name: true } },
      country: { select: { id: true, name: true } },
      documents: { select: { id: true, type: true, verification_status: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: candidates });
}
