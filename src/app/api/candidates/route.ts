import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { scopeCandidatesToRequester } from "@/server/scope";

const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;
const MAX_PAGE_SIZE = 100;

const CANDIDATE_SELECT = {
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
  country_name: true,
  partner: { select: { id: true, name: true } },
  documents: { select: { id: true, type: true, verification_status: true } },
} satisfies Prisma.CandidateSelect;

// GET /api/candidates — role-scoped candidate list (SRS FR-1.2, FR-2.3).
// A regional_recruiter sees only candidates they sourced; a
// country_supervisor sees their assigned country; in-house/director/admin
// see everything. Powers the /recruiter, /supervisor, and /management
// portal landing pages.
//
// Two distinct callers, two distinct shapes:
//  - The recruiter reporting flow auto-populates a report's candidate list
//    from period_start/period_end (both required together) — that window
//    is naturally small (a single day/week for one recruiter), so it gets
//    the full matching set, unpaginated, same as before.
//  - Everything else (the staff candidate list UI) is real server-side
//    search + pagination now: at 40-country/800-recruiter scale, a
//    country's candidate list runs into the thousands, and both "return
//    every row unbounded" and the previous hard take:100-with-no-offset
//    cap made anything past the newest ~100 permanently unreachable and
//    unsearchable.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...STAFF_ROLES]);
  if (guardRes) return guardRes;

  const scope = await scopeCandidatesToRequester(user!);
  const periodStart = req.nextUrl.searchParams.get("period_start");
  const periodEnd = req.nextUrl.searchParams.get("period_end");

  if (periodStart && periodEnd) {
    const candidates = await prisma.candidate.findMany({
      where: { ...scope, created_at: { gte: new Date(periodStart), lte: new Date(periodEnd) } },
      select: CANDIDATE_SELECT,
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json({ data: candidates });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const status = req.nextUrl.searchParams.get("status")?.trim();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize")) || 15));

  const where: Prisma.CandidateWhereInput = {
    ...scope,
    ...(status ? { lifecycle_status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { full_name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { user: { full_name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      select: CANDIDATE_SELECT,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.candidate.count({ where }),
  ]);

  return NextResponse.json({ data: candidates, total, page, pageSize });
}

// POST /api/candidates has been retired — a candidate (recruiter-sourced
// or self-service) is now created by submitting the Candidate Information
// Form itself (POST /api/applications), which is the first thing anyone
// fills in. See docs/PLATFORM_ARCHITECTURE.md.
