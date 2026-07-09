import { prisma } from "@/lib/prisma";

export interface ScreeningResult {
  passed: boolean;
  failures: string[];
}

const MINIMUM_AGE_YEARS = 18;
const MINIMUM_PASSPORT_VALIDITY_MONTHS = 6;

type ScreenableCandidate = {
  full_name: string | null;
  nationality: string | null;
  date_of_birth: Date | null;
  passport_number: string | null;
  passport_expiry: Date | null;
  phone: string | null;
  email: string | null;
  consent_given: boolean;
  user: { full_name: string; email: string; phone: string | null } | null;
  applications: {
    preferred_country_1_id: string | null;
    preferred_sector_id: string | null;
    earliest_travel_date: Date | null;
  }[];
};

function calculateAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function monthsUntil(date: Date): number {
  const now = new Date();
  return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
}

/**
 * Screening gate (SRS FR-2.5): evaluated against the Candidate Information
 * Form itself — the candidate's own Section 2 answers plus their
 * Application's Section 1 selections — not against uploaded documents or
 * an account, neither of which exist yet at this point in the real
 * process (the CIF is filled in first, screened, and only then does the
 * candidate get invited to create an account and upload documents).
 * "Role suitability" from FR-2.5 has no dedicated matching model yet
 * (that's Phase 4's Case/stage territory) — represented here as requiring
 * a preferred sector be on file via the CIF, not an actual suitability
 * judgment.
 */
export function evaluateScreeningGate(candidate: ScreenableCandidate): ScreeningResult {
  const failures: string[] = [];

  const fullName = candidate.user?.full_name ?? candidate.full_name;
  const email = candidate.user?.email ?? candidate.email;
  const phone = candidate.user?.phone ?? candidate.phone;

  if (!fullName) failures.push("Full name is missing.");
  if (!candidate.nationality) failures.push("Nationality is missing.");
  if (!candidate.date_of_birth) failures.push("Date of birth is missing.");
  if (!candidate.passport_number) failures.push("Passport number is missing.");
  if (!phone) failures.push("Phone number is missing.");
  if (!email) failures.push("Email address is missing.");

  if (candidate.date_of_birth && calculateAge(candidate.date_of_birth) < MINIMUM_AGE_YEARS) {
    failures.push(`Candidate is under the minimum eligible age of ${MINIMUM_AGE_YEARS}.`);
  }

  if (!candidate.passport_expiry) {
    failures.push("Passport expiry date is missing.");
  } else if (monthsUntil(candidate.passport_expiry) < MINIMUM_PASSPORT_VALIDITY_MONTHS) {
    failures.push(`Passport must have at least ${MINIMUM_PASSPORT_VALIDITY_MONTHS} months' validity remaining.`);
  }

  const application = candidate.applications[0];
  if (!application) {
    failures.push("No Candidate Information Form submission on file.");
  } else {
    if (!application.preferred_country_1_id) failures.push("Preferred programme country is missing.");
    if (!application.preferred_sector_id) failures.push("Preferred type of work is missing.");
    if (!application.earliest_travel_date) failures.push("Earliest possible travel date is missing.");
  }

  if (!candidate.consent_given) failures.push("Candidate consent has not been recorded.");

  return { passed: failures.length === 0, failures };
}

export async function evaluateScreeningGateForCandidateId(candidateId: string): Promise<ScreeningResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      full_name: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      passport_expiry: true,
      phone: true,
      email: true,
      consent_given: true,
      user: { select: { full_name: true, email: true, phone: true } },
      applications: {
        where: { application_status: { not: "rejected" } },
        orderBy: { submitted_at: "desc" },
        take: 1,
        select: { preferred_country_1_id: true, preferred_sector_id: true, earliest_travel_date: true },
      },
    },
  });

  if (!candidate) {
    return { passed: false, failures: ["Candidate not found."] };
  }

  return evaluateScreeningGate(candidate);
}
