import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireAdmin } from "@/lib/api-auth";
import { hashPassword, generateTemporaryPassword } from "@/lib/auth";
import { createStaffUserSchema } from "@/lib/validations";
import { isStaffRole } from "@/lib/rbac";
import type { Role } from "@prisma/client";

const STAFF_ROLES: Role[] = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"];

// GET /api/admin/users?role=&q= — staff directory for role/supervisor/country
// assignment (SRS FR-1.1, FR-1.3, FR-1.4). With no query, defaults to staff
// roles only; a text search (q) searches every user, including candidates,
// so an admin can find and promote one into the agent network. An explicit
// role param always narrows to that role regardless of q.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  const roleParam = req.nextUrl.searchParams.get("role") as Role | null;
  const q = req.nextUrl.searchParams.get("q");

  const users = await prisma.user.findMany({
    where: {
      role: roleParam ?? (q ? undefined : { in: STAFF_ROLES }),
      ...(q
        ? {
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
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
      created_at: true,
    },
    orderBy: { full_name: "asc" },
  });

  return NextResponse.json({ data: users });
}

// POST /api/admin/users — admin creates a brand-new staff account directly
// (rather than requiring self-registration + promotion). Returns a
// generated temporary password exactly once, in the response body — it is
// never stored in plaintext or logged; the admin is responsible for
// sharing it with the new staff member out of band.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = createStaffUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const { full_name, email, role, supervisor_id, assigned_country_id } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { code: "duplicate", message: "A user with this email already exists." } },
      { status: 409 }
    );
  }

  if (supervisor_id) {
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

  const temporaryPassword = generateTemporaryPassword();
  const password_hash = await hashPassword(temporaryPassword);

  const created = await auditedPrisma(user!.userId).user.create({
    data: {
      full_name,
      email,
      password_hash,
      role,
      email_verified: true, // admin-created — no self-verification needed
      supervisor_id: supervisor_id ?? undefined,
      assigned_country_id: assigned_country_id ?? undefined,
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

  return NextResponse.json({ data: created, temporaryPassword }, { status: 201 });
}
