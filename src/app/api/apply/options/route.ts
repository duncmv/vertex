import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// GET /api/apply/options — public reference data for the Candidate
// Information Form: destination countries, current-location countries,
// and sectors, all admin-managed. Destination countries are scoped to the
// "Europe" region — every programme Vertex currently places into is
// European. Current-location countries are the opposite: everywhere
// *except* Europe, the same source-market regions used for
// recruiter/supervisor territory assignment (Africa, Middle East & Gulf)
// — this is also what drives round-robin recruiter assignment for a
// self-service submission.
export async function GET() {
  const [countries, locationCountries, sectors] = await Promise.all([
    prisma.country.findMany({
      where: { region: { name: "Europe" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.country.findMany({
      where: { region: { name: { not: "Europe" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.sector.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ countries, locationCountries, sectors });
}
