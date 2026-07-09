import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { recordCasePaymentSchema } from "@/lib/validations";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { canAccessCase } from "@/server/scope";

const PAYMENT_RECORDER_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;

// POST /api/cases/:id/payments — record a milestone payment (SRS FR-4.5).
// This records that a payment was collected (with a receipt reference),
// gated by the admin-configured FeePolicy — it does not itself charge a
// card; that's the separate, already-built candidate application-fee flow.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...PAYMENT_RECORDER_ROLES]);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = recordCasePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: { application: { include: { candidate: true } } },
  });
  if (!caseRecord) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const allowed = await canAccessCase(user!, {
    user_id: caseRecord.application.candidate.user_id,
    recruiter_id: caseRecord.application.candidate.recruiter_id,
    country_id: caseRecord.application.candidate.country_id,
  });
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const countryId = caseRecord.application.candidate.country_id;
  const [countryPolicy, globalPolicy] = await Promise.all([
    countryId ? prisma.feePolicy.findFirst({ where: { country_id: countryId } }) : Promise.resolve(null),
    prisma.feePolicy.findFirst({ where: { country_id: null } }),
  ]);
  const effectivePolicy = countryPolicy ?? globalPolicy;

  if (!effectivePolicy?.enabled) {
    return NextResponse.json({ error: "Milestone payments are not enabled for this destination. An admin must enable the fee policy first." }, { status: 403 });
  }

  const payment = await auditedPrisma(user!.userId).casePayment.create({
    data: {
      case_id: id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      receipt_reference: parsed.data.receipt_reference,
      recorded_by: user!.userId,
    },
  });

  return NextResponse.json({ data: payment }, { status: 201 });
}

// GET /api/cases/:id/payments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...PAYMENT_RECORDER_ROLES]);
  if (guardRes) return guardRes;

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: { application: { include: { candidate: true } } },
  });
  if (!caseRecord) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const allowed = await canAccessCase(user!, {
    user_id: caseRecord.application.candidate.user_id,
    recruiter_id: caseRecord.application.candidate.recruiter_id,
    country_id: caseRecord.application.candidate.country_id,
  });
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const payments = await prisma.casePayment.findMany({ where: { case_id: id }, orderBy: { recorded_at: "desc" } });
  return NextResponse.json({ data: payments });
}
