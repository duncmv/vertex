import { prisma } from "@/lib/prisma";

export interface ScreeningResult {
  passed: boolean;
  failures: string[];
}

const MINIMUM_AGE_YEARS = 18;

type ScreenableCandidate = {
  full_name: string | null;
  nationality: string | null;
  date_of_birth: Date | null;
  passport_number: string | null;
  phone: string | null;
  email: string | null;
  desired_role: string | null;
  consent_given: boolean;
  user: { full_name: string; email: string; phone: string | null } | null;
  documents: { type: string; verification_status: string }[];
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

/**
 * Screening gate (SRS FR-2.5): a candidate cannot be guided to apply until
 * eligibility, documentation, availability/consent, and complete data are
 * confirmed. "Role suitability" from FR-2.5 has no dedicated matching model
 * yet (that's Phase 4's Case/stage territory) — represented here as simply
 * requiring a desired_role be on file, not an actual suitability judgment.
 */
export function evaluateScreeningGate(candidate: ScreenableCandidate): ScreeningResult {
  const failures: string[] = [];

  const fullName = candidate.user?.full_name ?? candidate.full_name;
  // Phone alone is enough at initial registration (a recruiter's first
  // field contact may only yield a phone number), but by the time a
  // candidate is guided to apply, an email is required — application
  // status updates, payment receipts, and their eventual account login
  // (User.email is unique + mandatory) all depend on it.
  const email = candidate.user?.email ?? candidate.email;
  const phone = candidate.user?.phone ?? candidate.phone;

  if (!fullName) failures.push("Full name is missing.");
  if (!candidate.nationality) failures.push("Nationality is missing.");
  if (!candidate.date_of_birth) failures.push("Date of birth is missing.");
  if (!candidate.passport_number) failures.push("Passport number is missing.");
  if (!phone) failures.push("Phone number is missing.");
  if (!email) failures.push("Email address is missing.");
  if (!candidate.desired_role) failures.push("Desired role is missing.");

  if (candidate.date_of_birth && calculateAge(candidate.date_of_birth) < MINIMUM_AGE_YEARS) {
    failures.push(`Candidate is under the minimum eligible age of ${MINIMUM_AGE_YEARS}.`);
  }

  const cv = candidate.documents.find((d) => d.type === "cv");
  const passport = candidate.documents.find((d) => d.type === "passport");
  if (!cv) failures.push("CV has not been uploaded.");
  else if (cv.verification_status === "rejected") failures.push("Uploaded CV was rejected.");
  if (!passport) failures.push("Passport scan has not been uploaded.");
  else if (passport.verification_status === "rejected") failures.push("Uploaded passport scan was rejected.");

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
      phone: true,
      email: true,
      desired_role: true,
      consent_given: true,
      user: { select: { full_name: true, email: true, phone: true } },
      documents: { select: { type: true, verification_status: true } },
    },
  });

  if (!candidate) {
    return { passed: false, failures: ["Candidate not found."] };
  }

  return evaluateScreeningGate(candidate);
}
