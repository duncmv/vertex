import { prisma } from "@/lib/prisma";

/**
 * Round-robin recruiter assignment for a self-service candidate (no
 * recruiter already involved) — picks the next Regional Recruiter
 * assigned to the candidate's current-location country. Only called at
 * Candidate creation time; never reassigns an existing candidate.
 *
 * Whose turn is next is derived from history (the most recently created
 * candidate already assigned to one of that country's recruiters) rather
 * than a stored cursor — consistent with this codebase's preference for
 * computed state over new persisted state (e.g. KPI actuals).
 */
export async function assignNextRecruiterForCountry(countryId: string): Promise<string | null> {
  const recruiters = await prisma.user.findMany({
    where: { role: "regional_recruiter", assigned_country_id: countryId },
    select: { id: true },
    orderBy: { created_at: "asc" },
  });
  if (recruiters.length === 0) return null;
  if (recruiters.length === 1) return recruiters[0].id;

  const lastAssigned = await prisma.candidate.findFirst({
    where: { country_id: countryId, recruiter_id: { in: recruiters.map((r: { id: string }) => r.id) } },
    orderBy: { created_at: "desc" },
    select: { recruiter_id: true },
  });
  if (!lastAssigned) return recruiters[0].id;

  const lastIdx = recruiters.findIndex((r: { id: string }) => r.id === lastAssigned.recruiter_id);
  if (lastIdx === -1) return recruiters[0].id;

  return recruiters[(lastIdx + 1) % recruiters.length].id;
}
