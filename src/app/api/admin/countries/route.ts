import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAdmin } from "@/lib/api-auth";
import { createCountrySchema } from "@/lib/validations";

// GET /api/admin/countries — flat list, used by assignment dropdowns
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  const countries = await prisma.country.findMany({
    include: { region: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: countries });
}

// POST /api/admin/countries
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

  const parsed = createCountrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const region = await prisma.region.findUnique({ where: { id: parsed.data.region_id } });
  if (!region) {
    return NextResponse.json({ error: { code: "not_found", message: "Region not found." } }, { status: 404 });
  }

  const existing = await prisma.country.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json(
      { error: { code: "duplicate", message: "A country with this name already exists." } },
      { status: 409 }
    );
  }

  const country = await prisma.country.create({ data: parsed.data });
  return NextResponse.json({ data: country }, { status: 201 });
}
