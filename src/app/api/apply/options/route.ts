import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// GET /api/apply/options — public reference data for the Candidate
// Information Form: destination countries, current-location countries,
// sectors, and document requirement types, all admin-managed. Destination
// countries are scoped to the "Europe" region — every programme Vertex
// currently places into is European. Current-location countries are the
// opposite: everywhere *except* Europe, the same source-market regions
// used for recruiter/supervisor territory assignment (Africa, Middle East
// & Gulf) — this is also what drives round-robin recruiter assignment for
// a self-service submission. documentTypes + documentRequirements let the
// form render its Section 3 checklist (and "Required for: X" hints)
// entirely from admin-managed data — a type/requirement admin adds shows
// up here immediately, no code change needed.
export async function GET() {
  const [countries, locationCountries, sectors, documentTypes, documentRequirements] = await Promise.all([
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
    prisma.documentRequirementType.findMany({
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    }),
    prisma.countryDocumentRequirement.findMany({
      select: { country_id: true, document_type: true },
    }),
  ]);

  return NextResponse.json({ countries, locationCountries, sectors, documentTypes, documentRequirements });
}
