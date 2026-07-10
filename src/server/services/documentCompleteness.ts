import { prisma } from "@/lib/prisma";

export interface DocumentCompletenessResult {
  complete: boolean;
  missingTypes: string[];
}

/**
 * What "documents submitted" means now that the Candidate Information
 * Form is filled in before any documents exist: the universal set
 * (admin-managed DocumentRequirementType.is_universal — Candidate
 * Information Form §3's items with no "Required for: X" tag) plus
 * whatever extra documents the candidate's chosen destination country
 * requires (admin-managed CountryDocumentRequirement) — not just a flat
 * cv/passport check.
 */
export async function evaluateDocumentCompletenessForCandidateId(candidateId: string): Promise<DocumentCompletenessResult> {
  const [documents, application, universalTypes] = await Promise.all([
    prisma.document.findMany({ where: { candidate_id: candidateId }, select: { type: true } }),
    prisma.application.findFirst({
      where: { candidate_id: candidateId, application_status: { not: "rejected" } },
      orderBy: { submitted_at: "desc" },
      select: { preferred_country_1_id: true },
    }),
    prisma.documentRequirementType.findMany({ where: { is_universal: true }, select: { key: true } }),
  ]);

  const countryExtras = application?.preferred_country_1_id
    ? await prisma.countryDocumentRequirement.findMany({
        where: { country_id: application.preferred_country_1_id },
        select: { document_type: true },
      })
    : [];

  const requiredTypes = [
    ...universalTypes.map((t: { key: string }) => t.key),
    ...countryExtras.map((c: { document_type: string }) => c.document_type),
  ];
  const uploadedTypes = new Set(documents.map((d: { type: string }) => d.type));
  const missingTypes = requiredTypes.filter((t) => !uploadedTypes.has(t));

  return { complete: missingTypes.length === 0, missingTypes };
}
