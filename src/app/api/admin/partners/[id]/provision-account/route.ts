import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { hashPassword, generateTemporaryPassword } from "@/lib/auth";
import { provisionPartnerAccountSchema } from "@/lib/validations";

const PARTNER_MANAGER_ROLES = ["inhouse_supervisor", "director", "admin"] as const;

// POST /api/admin/partners/:id/provision-account — same manager tier as
// the rest of Partner CRUD (create/status/MOU) creates the partner's own
// login (SRS FR-5.1), reusing the temp-password pattern from
// POST /api/admin/users: returned once in the response body, never
// stored/logged in plaintext; staff share it with the partner out of band.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...PARTNER_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  const { id } = await params;
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: { code: "not_found", message: "Partner not found." } }, { status: 404 });
  }
  if (partner.user_id) {
    return NextResponse.json({ error: { code: "already_provisioned", message: "This partner already has a login." } }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = provisionPartnerAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const email = parsed.data.email ?? partner.contact_email;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: { code: "duplicate", message: "A user with this email already exists." } }, { status: 409 });
  }

  const temporaryPassword = generateTemporaryPassword();
  const password_hash = await hashPassword(temporaryPassword);

  const db = auditedPrisma(user!.userId);
  const newUser = await db.user.create({
    data: {
      full_name: partner.contact_name,
      email,
      password_hash,
      role: "partner",
      email_verified: true,
    },
  });
  const updatedPartner = await db.partner.update({ where: { id }, data: { user_id: newUser.id } });

  return NextResponse.json({ data: updatedPartner, temporaryPassword }, { status: 201 });
}
