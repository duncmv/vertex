import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { submitReportSchema } from "@/lib/validations";
import type { Prisma, ScopeLevel } from "@prisma/client";

const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;

// GET /api/reports — role-scoped (SRS FR-3.4, FR-3.7 escalation path):
// a recruiter sees their own; a supervisor sees their own country
// reports plus their recruiters' submissions awaiting review; in-house/
// director/admin see everything, filterable by country/type/status.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...STAFF_ROLES]);
  if (guardRes) return guardRes;

  const { searchParams } = req.nextUrl;
  const countryId = searchParams.get("country_id") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  let where: Prisma.ReportWhereInput;
  switch (user!.role) {
    case "regional_recruiter":
      where = { submitted_by: user!.userId };
      break;
    case "country_supervisor": {
      const supervisor = await prisma.user.findUnique({ where: { id: user!.userId }, select: { assigned_country_id: true } });
      if (!supervisor?.assigned_country_id) {
        where = { id: "__none__" }; // fails closed, matching scope.ts's convention
      } else {
        where = {
          OR: [
            { submitted_by: user!.userId },
            { scope_level: "recruiter", country_id: supervisor.assigned_country_id },
          ],
        };
      }
      break;
    }
    // In-House Supervisor is assigned to one specific country (same as
    // Country Supervisor) — sees that country's own recruiter-level
    // reports (daily-submission visibility) and its country-level reports
    // (the ones they're the controlling reviewer for), never other
    // countries'.
    case "inhouse_supervisor": {
      const supervisor = await prisma.user.findUnique({ where: { id: user!.userId }, select: { assigned_country_id: true } });
      where = supervisor?.assigned_country_id ? { country_id: supervisor.assigned_country_id } : { id: "__none__" };
      break;
    }
    default:
      where = {}; // director, admin — unrestricted
  }

  const reports = await prisma.report.findMany({
    where: {
      AND: [
        where,
        countryId ? { country_id: countryId } : {},
        type ? { type: type as never } : {},
        status ? { status: status as never } : {},
      ],
    },
    select: {
      id: true,
      type: true,
      scope_level: true,
      status: true,
      period_start: true,
      period_end: true,
      return_reason: true,
      content: true,
      submitter: { select: { id: true, full_name: true } },
      country: { select: { id: true, name: true } },
      parent_report_id: true,
      child_reports: { select: { id: true, status: true, submitter: { select: { full_name: true } } } },
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ data: reports });
}

// POST /api/reports — submit a new report (SRS FR-3.4). A recruiter
// submits at their own scope; a country_supervisor consolidates verified
// recruiter reports (child_report_ids) into a country report.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["regional_recruiter", "country_supervisor"]);
  if (guardRes) return guardRes;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = submitReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const submitter = await prisma.user.findUnique({ where: { id: user!.userId }, select: { assigned_country_id: true } });
  if (!submitter?.assigned_country_id) {
    return NextResponse.json({ error: { code: "no_country", message: "You must be assigned a country before submitting a report." } }, { status: 422 });
  }

  const scopeLevel: ScopeLevel = user!.role === "regional_recruiter" ? "recruiter" : "country";
  const { period_start, period_end, child_report_ids, ...rest } = parsed.data;

  if (scopeLevel === "recruiter" && child_report_ids?.length) {
    return NextResponse.json(
      { error: { code: "invalid_scope", message: "Only a country-level report can consolidate child reports." } },
      { status: 422 }
    );
  }

  let childReports: { id: string }[] = [];
  if (child_report_ids?.length) {
    childReports = await prisma.report.findMany({
      where: {
        id: { in: child_report_ids },
        scope_level: "recruiter",
        status: "verified",
        country_id: submitter.assigned_country_id,
      },
      select: { id: true },
    });
    if (childReports.length !== child_report_ids.length) {
      return NextResponse.json(
        { error: { code: "invalid_children", message: "Every consolidated report must be a verified recruiter report from your own country." } },
        { status: 422 }
      );
    }
  }

  const db = auditedPrisma(user!.userId);

  const report = await db.report.create({
    data: {
      ...rest,
      scope_level: scopeLevel,
      country_id: submitter.assigned_country_id,
      submitted_by: user!.userId,
      period_start: new Date(period_start),
      period_end: new Date(period_end),
      status: "submitted",
    },
    select: { id: true, type: true, scope_level: true, status: true },
  });

  if (childReports.length > 0) {
    await prisma.report.updateMany({
      where: { id: { in: childReports.map((c) => c.id) } },
      data: { parent_report_id: report.id, status: "consolidated" },
    });
  }

  return NextResponse.json({ data: report }, { status: 201 });
}
