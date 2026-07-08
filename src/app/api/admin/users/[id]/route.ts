import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireAdmin } from "@/lib/api-auth";
import { updateStaffUserSchema } from "@/lib/validations";
import { isStaffRole } from "@/lib/rbac";

// PATCH /api/admin/users/:id — assign role, supervisor, and/or country
// (SRS FR-1.1, FR-1.3 "support reassignment", FR-1.4).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = updateStaffUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: { code: "not_found", message: "User not found." } }, { status: 404 });
  }

  const { supervisor_id, assigned_country_id, role } = parsed.data;

  // Unity of command (FR-1.3): no self-supervision, and a supervisor must
  // themselves be a staff member, not a candidate.
  if (supervisor_id) {
    if (supervisor_id === id) {
      return NextResponse.json(
        { error: { code: "invalid_supervisor", message: "A user cannot supervise themselves." } },
        { status: 422 }
      );
    }
    const supervisor = await prisma.user.findUnique({ where: { id: supervisor_id } });
    if (!supervisor || !isStaffRole(supervisor.role)) {
      return NextResponse.json(
        { error: { code: "invalid_supervisor", message: "Supervisor must be an existing staff member." } },
        { status: 422 }
      );
    }
  }

  if (assigned_country_id) {
    const country = await prisma.country.findUnique({ where: { id: assigned_country_id } });
    if (!country) {
      return NextResponse.json({ error: { code: "not_found", message: "Country not found." } }, { status: 404 });
    }
  }

  const updated = await auditedPrisma(user!.userId).user.update({
    where: { id },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(supervisor_id !== undefined ? { supervisor_id } : {}),
      ...(assigned_country_id !== undefined ? { assigned_country_id } : {}),
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      supervisor_id: true,
      supervisor: { select: { id: true, full_name: true } },
      assigned_country_id: true,
      assigned_country: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
