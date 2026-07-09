import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { scopeCasesToRequester } from "@/server/scope";
import type { CaseStage } from "@prisma/client";

const CASE_ACCESS_ROLES = ["candidate", "regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;

// GET /api/cases — the mobility-lifecycle case list (SRS FR-4.1/4.2),
// scoped exactly like the candidate list (recruiter sees their own
// candidates' cases, supervisor their country's, management/admin all, a
// candidate sees only their own).
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...CASE_ACCESS_ROLES]);
  if (guardRes) return guardRes;

  const scope = await scopeCasesToRequester(user!);
  const stageParam = req.nextUrl.searchParams.get("stage") as CaseStage | null;

  const cases = await prisma.case.findMany({
    where: { ...scope, ...(stageParam ? { current_stage: stageParam } : {}) },
    include: {
      application: {
        include: {
          candidate: { include: { user: { select: { full_name: true, email: true } }, country: true, recruiter: { select: { full_name: true } } } },
          job: { select: { title: true, country: true, city: true } },
        },
      },
      contract: { select: { status: true } },
      retention_follow_up: { select: { due_at: true, completed_at: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  return NextResponse.json({ data: cases });
}
