import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { updatePartnerSchema } from "@/lib/validations";

const PARTNER_MANAGER_ROLES = ["inhouse_supervisor", "director", "admin"] as const;

// GET /api/admin/partners/:id — detail, including candidates it has sourced.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"]);
  if (guardRes) return guardRes;

  const { id } = await params;
  const partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      candidates: {
        select: {
          id: true,
          full_name: true,
          lifecycle_status: true,
          created_at: true,
          user: { select: { full_name: true, email: true } },
          recruiter: { select: { id: true, full_name: true } },
        },
        orderBy: { created_at: "desc" },
      },
    },
  });
  if (!partner) {
    return NextResponse.json({ error: { code: "not_found", message: "Partner not found." } }, { status: 404 });
  }

  return NextResponse.json({ data: partner });
}

// PATCH /api/admin/partners/:id — status and MOU updates go through here.
// Marking mou_status "signed" auto-stamps mou_signed_at rather than
// requiring the caller to also supply a timestamp.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...PARTNER_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  const { id } = await params;
  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: { code: "not_found", message: "Partner not found." } }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = updatePartnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const db = auditedPrisma(user!.userId);
  const partner = await db.partner.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.mou_status === "signed" && existing.mou_status !== "signed"
        ? { mou_signed_at: new Date() }
        : {}),
    },
  });

  return NextResponse.json({ data: partner });
}
