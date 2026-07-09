import type { JwtPayload } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Row-level scoping (SRS FR-1.2 least privilege): every list/read of
 * candidate records goes through here rather than duplicating
 * "if role === X then where..." across route handlers.
 *
 * Fails closed — an unrecognized or unassigned state scopes to nothing,
 * never to everything.
 */
export async function scopeCandidatesToRequester(
  user: JwtPayload
): Promise<Prisma.CandidateWhereInput> {
  switch (user.role) {
    case "regional_recruiter":
      return { recruiter_id: user.userId };

    case "country_supervisor": {
      const supervisor = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { assigned_country_id: true },
      });
      return supervisor?.assigned_country_id
        ? { country_id: supervisor.assigned_country_id }
        : { id: "__none__" };
    }

    case "inhouse_supervisor":
    case "director":
    case "admin":
      return {};

    case "candidate":
      return { user_id: user.userId };

    default:
      return { id: "__none__" };
  }
}

type CandidateAccessCheck = {
  user_id: string | null;
  recruiter_id: string | null;
  country_id: string | null;
};

/**
 * Single-record authorization check for anything scoped to a candidate
 * (documents, cases, etc. in later phases). Mirrors scopeCandidatesToRequester
 * but for the "can this requester touch this one record" case.
 */
export async function canAccessCandidate(
  user: JwtPayload,
  candidate: CandidateAccessCheck
): Promise<boolean> {
  switch (user.role) {
    case "candidate":
      return candidate.user_id === user.userId;

    case "regional_recruiter":
      return candidate.recruiter_id === user.userId;

    case "country_supervisor": {
      if (!candidate.country_id) return false;
      const supervisor = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { assigned_country_id: true },
      });
      return supervisor?.assigned_country_id === candidate.country_id;
    }

    case "inhouse_supervisor":
    case "director":
    case "admin":
      return true;

    default:
      return false;
  }
}

/**
 * Row-level scoping for Cases (SRS FR-4.2), derived through the existing
 * candidate scope rather than duplicating recruiter_id/country_id onto
 * Case itself — a case is always reached via application -> candidate.
 */
export async function scopeCasesToRequester(user: JwtPayload): Promise<Prisma.CaseWhereInput> {
  const candidateScope = await scopeCandidatesToRequester(user);
  return { application: { candidate: candidateScope } };
}

/**
 * Single-record authorization check for a Case — mirrors canAccessCandidate.
 */
export async function canAccessCase(
  user: JwtPayload,
  candidate: CandidateAccessCheck
): Promise<boolean> {
  return canAccessCandidate(user, candidate);
}
