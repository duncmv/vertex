import { prisma } from "@/lib/prisma";
import type { DocumentType } from "@prisma/client";

// Every programme requires these regardless of destination (Candidate
// Information Form §3, the items with no "Required for: X" tag).
const UNIVERSAL_REQUIRED_TYPES: DocumentType[] = ["cv", "passport", "passport_photo"];

export interface DocumentCompletenessResult {
  complete: boolean;
  missingTypes: DocumentType[];
}

/**
 * What "documents submitted" means now that the Candidate Information
 * Form is filled in before any documents exist: the universal set plus
 * whatever extra documents the candidate's chosen destination country
 * requires (admin-managed CountryDocumentRequirement, §3's "Required
 * for: X" tags) — not just a flat cv/passport check.
 */
export async function evaluateDocumentCompletenessForCandidateId(candidateId: string): Promise<DocumentCompletenessResult> {
  const [documents, application] = await Promise.all([
    prisma.document.findMany({ where: { candidate_id: candidateId }, select: { type: true } }),
    prisma.application.findFirst({
      where: { candidate_id: candidateId, application_status: { not: "rejected" } },
      orderBy: { submitted_at: "desc" },
      select: { preferred_country_1_id: true },
    }),
  ]);

  const countryExtras = application?.preferred_country_1_id
    ? await prisma.countryDocumentRequirement.findMany({
        where: { country_id: application.preferred_country_1_id },
        select: { document_type: true },
      })
    : [];

  const requiredTypes = [...UNIVERSAL_REQUIRED_TYPES, ...countryExtras.map((c: { document_type: DocumentType }) => c.document_type)];
  const uploadedTypes = new Set(documents.map((d: { type: DocumentType }) => d.type));
  const missingTypes = requiredTypes.filter((t) => !uploadedTypes.has(t));

  return { complete: missingTypes.length === 0, missingTypes };
}
