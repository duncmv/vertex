import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { scopeCandidatesToRequester } from "@/server/scope";

const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;

// GET /api/candidates — role-scoped candidate list (SRS FR-1.2, FR-2.3).
// A regional_recruiter sees only candidates they sourced; a
// country_supervisor sees their assigned country; in-house/director/admin
// see everything. Powers the /recruiter, /supervisor, and /management
// portal landing pages. Optional period_start/period_end (both required
// together) narrow to candidates created in that window — "date of
// application" is the Candidate's own created_at, since a CIF submission
// is what creates the Candidate record in the first place — used by the
// recruiter reporting flow to auto-populate a report's candidate list.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...STAFF_ROLES]);
  if (guardRes) return guardRes;

  const scope = await scopeCandidatesToRequester(user!);
  const periodStart = req.nextUrl.searchParams.get("period_start");
  const periodEnd = req.nextUrl.searchParams.get("period_end");
  if (periodStart && periodEnd) {
    scope.created_at = { gte: new Date(periodStart), lte: new Date(periodEnd) };
  }

  const candidates = await prisma.candidate.findMany({
    where: scope,
    select: {
      id: true,
      source: true,
      lifecycle_status: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      full_name: true,
      phone: true,
      email: true,
      desired_role: true,
      consent_given: true,
      return_reason: true,
      screening_result: true,
      created_at: true,
      second_nationality: true,
      passport_expiry: true,
      current_occupation: true,
      highest_education: true,
      home_address: true,
      whatsapp_number: true,
      marital_status: true,
      user: { select: { full_name: true, email: true } },
      recruiter: { select: { id: true, full_name: true } },
      country: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
      partner: { select: { id: true, name: true } },
      documents: { select: { id: true, type: true, verification_status: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: candidates });
}

// POST /api/candidates has been retired — a candidate (recruiter-sourced
// or self-service) is now created by submitting the Candidate Information
// Form itself (POST /api/applications), which is the first thing anyone
// fills in. See docs/PLATFORM_ARCHITECTURE.md.
