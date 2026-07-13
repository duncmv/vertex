import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { scopeCasesToRequester } from "@/server/scope";
import type { CaseStage } from "@prisma/client";

const CASE_ACCESS_ROLES = ["candidate", "regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;
const MAX_PAGE_SIZE = 200;

// GET /api/cases — the mobility-lifecycle case list (SRS FR-4.1/4.2),
// scoped exactly like the candidate list (recruiter sees their own
// candidates' cases, supervisor their country's, management/admin all, a
// candidate sees only their own). Paginated, defaulting to page 1 / 50
// rows even without params, since a candidate's own case count stays
// tiny but a supervisor/management view scales with country/platform
// volume the same way the candidate and application lists do.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...CASE_ACCESS_ROLES]);
  if (guardRes) return guardRes;

  const scope = await scopeCasesToRequester(user!);
  const stageParam = req.nextUrl.searchParams.get("stage") as CaseStage | null;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize")) || 50));
  const where = { ...scope, ...(stageParam ? { current_stage: stageParam } : {}) };

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        application: {
          include: {
            candidate: { include: { user: { select: { full_name: true, email: true } }, country: true, recruiter: { select: { full_name: true } } } },
            job: { select: { title: true, country: true, city: true } },
            preferred_country_1: { select: { name: true } },
            preferred_sector: { select: { name: true } },
          },
        },
        contract: { select: { status: true } },
        retention_follow_up: { select: { due_at: true, completed_at: true } },
      },
      orderBy: { updated_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.case.count({ where }),
  ]);

  return NextResponse.json({ data: cases, total, page, pageSize });
}
