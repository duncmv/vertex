import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { updateFeePolicySchema } from "@/lib/validations";
import { getAuthUser, requireAdmin, requireRole } from "@/lib/api-auth";

// GET /api/fee-policy — readable by any staff role (a recruiter recording
// a payment needs to know whether it's enabled), editable by admin only.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"]);
  if (guardRes) return guardRes;

  const policies = await prisma.feePolicy.findMany({ include: { country: { select: { name: true } } }, orderBy: { updated_at: "desc" } });
  return NextResponse.json({ data: policies });
}

// POST /api/fee-policy — SRS FR-4.5: admin-configurable milestone-payment
// policy, defaults disabled. Upserts by country_id (null = global default)
// rather than creating duplicate rows on every save.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateFeePolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const countryId = parsed.data.country_id ?? null;
  const existing = await prisma.feePolicy.findFirst({ where: { country_id: countryId } });

  const db = auditedPrisma(user!.userId);
  const data = {
    country_id: countryId,
    enabled: parsed.data.enabled,
    initial_amount: parsed.data.initial_amount ?? null,
    final_amount: parsed.data.final_amount ?? null,
    currency: parsed.data.currency,
    updated_by: user!.userId,
  };

  const policy = existing
    ? await db.feePolicy.update({ where: { id: existing.id }, data })
    : await db.feePolicy.create({ data });

  return NextResponse.json({ data: policy });
}
