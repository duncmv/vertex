import { prisma } from "@/lib/prisma";

export interface DocumentCompletenessResult {
  complete: boolean;
  missingTypes: string[];
}

/**
 * Required document type keys for one destination country: the universal
 * set (admin-managed DocumentRequirementType.is_universal — Candidate
 * Information Form §3's items with no "Required for: X" tag) plus
 * whatever extra documents that country requires (admin-managed
 * CountryDocumentRequirement). Shared by the screening-gate completeness
 * check below and anywhere that needs a single application's own
 * requirement list (candidate dashboard, staff candidate detail).
 */
export async function getRequiredDocumentTypesForCountryId(countryId: string | null): Promise<string[]> {
  const [universalTypes, countryExtras] = await Promise.all([
    prisma.documentRequirementType.findMany({ where: { is_universal: true }, select: { key: true } }),
    countryId
      ? prisma.countryDocumentRequirement.findMany({ where: { country_id: countryId }, select: { document_type: true } })
      : Promise.resolve([] as { document_type: string }[]),
  ]);
  return [
    ...new Set([
      ...universalTypes.map((t: { key: string }) => t.key),
      ...countryExtras.map((c: { document_type: string }) => c.document_type),
    ]),
  ];
}

/**
 * What "documents submitted" means now that the Candidate Information
 * Form is filled in before any documents exist: the union of required
 * types across every one of the candidate's own non-rejected
 * applications, not just their most recent one — a candidate who applied
 * to two programmes with different document requirements still needs
 * both satisfied before they're "submitted", not just whichever
 * application happens to be newest.
 */
export async function evaluateDocumentCompletenessForCandidateId(candidateId: string): Promise<DocumentCompletenessResult> {
  const [documents, applications] = await Promise.all([
    prisma.document.findMany({ where: { candidate_id: candidateId }, select: { type: true } }),
    prisma.application.findMany({
      where: { candidate_id: candidateId, application_status: { not: "rejected" } },
      select: { preferred_country_1_id: true },
    }),
  ]);

  const rawCountryIds: string[] = applications
    .map((a: { preferred_country_1_id: string | null }) => a.preferred_country_1_id)
    .filter((id: string | null): id is string => !!id);
  const countryIds = [...new Set<string>(rawCountryIds)];
  const requiredPerCountry = await Promise.all(countryIds.map((id) => getRequiredDocumentTypesForCountryId(id)));
  // Always include the universal set even if no application has a
  // destination country yet — matches the original behavior where the
  // universal set applied regardless of country selection.
  const universalOnly = await getRequiredDocumentTypesForCountryId(null);

  const requiredTypes = [...new Set([universalOnly, ...requiredPerCountry].flat())];
  const uploadedTypes = new Set(documents.map((d: { type: string }) => d.type));
  const missingTypes = requiredTypes.filter((t) => !uploadedTypes.has(t));

  return { complete: missingTypes.length === 0, missingTypes };
}
