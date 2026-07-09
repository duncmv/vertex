import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// GET /api/apply/options — public reference data for the Candidate
// Information Form: destination countries and sectors, both admin-managed.
// Countries are scoped to the "Europe" region — every programme Vertex
// currently places into is European, and admin adds new destination
// countries there rather than to the source-market regions used for
// recruiter/supervisor territory assignment (Africa, Middle East & Gulf).
export async function GET() {
  const [countries, sectors] = await Promise.all([
    prisma.country.findMany({
      where: { region: { name: "Europe" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.sector.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ countries, sectors });
}
