import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// GET /api/apply/options — public reference data for the Candidate
// Information Form: destination countries, current-location countries
// (still used as-is by the Agency form / PartnerCandidateForm, whose
// current_location_country_id stays a required Country FK), sectors, and
// document requirement types, all admin-managed, plus recruiterCountryNames
// (see below). Destination countries are scoped to the "Europe" region —
// every programme Vertex currently places into is European.
// locationCountries are the source-market regions (Africa, Middle East &
// Gulf). The public Candidate Information Form itself (ApplicationForm.tsx)
// no longer restricts current-location to this list at all — it offers the
// full world-country list (lib/worldCountries.ts) so a candidate from
// anywhere can complete the form — but recruiterCountryNames (the subset of
// locationCountries that currently have at least one assigned Regional
// Recruiter) tells the client which of those names can actually be
// round-robin-assigned a recruiter; ApplicationForm.tsx falls back to the
// email-intake bridge for any self-service submission outside that set,
// even when the CRM is otherwise active. documentTypes + documentRequirements
// let the form render its Section 3 checklist (and "Required for: X" hints)
// entirely from admin-managed data — a type/requirement admin adds shows up
// here immediately, no code change needed.
export async function GET() {
  const [countries, locationCountries, recruiterCountries, sectors, documentTypes, documentRequirements, intakeModeSetting] = await Promise.all([
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
    prisma.country.findMany({
      where: {
        region: { name: { not: "Europe" } },
        users: { some: { role: "regional_recruiter" } },
      },
      select: { name: true },
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
    // Defaults "email" (not "crm") when unset — the site is meant to be
    // deployable to the main domain before the CRM's staff workflows are
    // signed off, so an unconfigured deployment must fail safe toward not
    // touching the CRM, not the other way around.
    prisma.systemSetting.findUnique({ where: { key: "intake_mode" } }),
  ]);

  const intakeMode = intakeModeSetting?.value === "crm" ? "crm" : "email";
  const recruiterCountryNames = recruiterCountries.map((c: { name: string }) => c.name);

  return NextResponse.json({ countries, locationCountries, sectors, documentTypes, documentRequirements, intakeMode, recruiterCountryNames });
}
