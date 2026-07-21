import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { raiseExceptionSchema } from "@/lib/validations";
import { canAccessCandidate } from "@/server/scope";
import type { EscalationLevel, Prisma, Role } from "@prisma/client";

const STAFF_ROLES: Role[] = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"];
const MAX_PAGE_SIZE = 100;

// Where each role's exceptions "start" when they raise one fresh — a
// recruiter always starts at the bottom, since the escalation line
// (Supervisory Reporting Framework §6) begins with them regardless of who
// the exception is actually about.
const RAISE_LEVEL_BY_ROLE: Record<Role, EscalationLevel> = {
  regional_recruiter: "regional",
  country_supervisor: "country",
  inhouse_supervisor: "inhouse",
  director: "management",
  admin: "management",
  marketing: "regional",
  partner: "regional",
  candidate: "regional",
};

async function generateReference(): Promise<string> {
  const count = await prisma.exception.count();
  return `EXC-${String(count + 1).padStart(6, "0")}`;
}

// GET /api/exceptions — role-scoped, same shape as /api/reports: a
// recruiter sees their own; a country/in-house supervisor sees their own
// plus their country's; director/admin see everything.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, STAFF_ROLES);
  if (guardRes) return guardRes;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const escalationLevel = searchParams.get("escalation_level") ?? undefined;

  let where: Prisma.ExceptionWhereInput;
  switch (user!.role) {
    case "regional_recruiter":
      where = { raised_by: user!.userId };
      break;
    case "country_supervisor":
    case "inhouse_supervisor": {
      const staff = await prisma.user.findUnique({ where: { id: user!.userId }, select: { assigned_country_id: true } });
      where = staff?.assigned_country_id
        ? { OR: [{ raised_by: user!.userId }, { country_id: staff.assigned_country_id }] }
        : { raised_by: user!.userId };
      break;
    }
    default:
      where = {}; // director, admin — unrestricted
  }

  const combinedWhere: Prisma.ExceptionWhereInput = {
    AND: [where, status ? { status: status as never } : {}, escalationLevel ? { escalation_level: escalationLevel as never } : {}],
  };

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize")) || 15));

  const [data, total] = await Promise.all([
    prisma.exception.findMany({
      where: combinedWhere,
      select: {
        id: true,
        reference: true,
        category: true,
        raiser: { select: { id: true, full_name: true, role: true } },
        role_at_raise: true,
        country: { select: { id: true, name: true } },
        candidate: { select: { id: true, full_name: true } },
        reference_note: true,
        issue_statement: true,
        immediate_impact: true,
        decision_required: true,
        decision_deadline: true,
        escalation_level: true,
        status: true,
        decision: true,
        decision_notes: true,
        decider: { select: { id: true, full_name: true } },
        decided_at: true,
        created_at: true,
        corrective_actions: {
          select: { id: true, action: true, owner: { select: { id: true, full_name: true } }, due_date: true, success_measure: true, status: true, evidence: true },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.exception.count({ where: combinedWhere }),
  ]);

  return NextResponse.json({ data, total, page, pageSize });
}

// POST /api/exceptions — raise a new exception (Supervisory Reporting
// Framework §6). Any staff role may raise one, at any time, independent
// of the daily/weekly/monthly reporting cadence.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, STAFF_ROLES);
  if (guardRes) return guardRes;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = raiseExceptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  if (parsed.data.candidate_id) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: parsed.data.candidate_id },
      select: { user_id: true, recruiter_id: true, country_id: true },
    });
    if (!candidate || !(await canAccessCandidate(user!, candidate))) {
      return NextResponse.json({ error: { code: "forbidden", message: "You don't have access to that candidate." } }, { status: 403 });
    }
  }

  const staff = await prisma.user.findUnique({ where: { id: user!.userId }, select: { assigned_country_id: true } });
  const { corrective_actions, ...rest } = parsed.data;

  const db = auditedPrisma(user!.userId);

  let exception;
  try {
    exception = await db.exception.create({
      data: {
        ...rest,
        reference: await generateReference(),
        raised_by: user!.userId,
        role_at_raise: user!.role,
        country_id: staff?.assigned_country_id ?? null,
        decision_deadline: new Date(parsed.data.decision_deadline),
        escalation_level: RAISE_LEVEL_BY_ROLE[user!.role],
        corrective_actions: {
          create: corrective_actions.map((a) => ({
            action: a.action,
            owner_id: a.owner_id,
            due_date: a.due_date ? new Date(a.due_date) : undefined,
            success_measure: a.success_measure,
          })),
        },
      },
      select: { id: true, reference: true },
    });
  } catch (err: unknown) {
    // Extremely rare race on the sequential reference number — retry once.
    if ((err as { code?: string })?.code === "P2002") {
      exception = await db.exception.create({
        data: {
          ...rest,
          reference: await generateReference(),
          raised_by: user!.userId,
          role_at_raise: user!.role,
          country_id: staff?.assigned_country_id ?? null,
          decision_deadline: new Date(parsed.data.decision_deadline),
          escalation_level: RAISE_LEVEL_BY_ROLE[user!.role],
          corrective_actions: {
            create: corrective_actions.map((a) => ({
              action: a.action,
              owner_id: a.owner_id,
              due_date: a.due_date ? new Date(a.due_date) : undefined,
              success_measure: a.success_measure,
            })),
          },
        },
        select: { id: true, reference: true },
      });
    } else {
      throw err;
    }
  }

  return NextResponse.json({ data: exception }, { status: 201 });
}
