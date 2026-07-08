import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const EMAIL_TOKEN_EXPIRES_IN = process.env.EMAIL_TOKEN_EXPIRES_IN || "24h";

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface EmailTokenPayload {
  userId: string;
  email: string;
  type: "email_verification" | "password_reset";
}

export interface DocumentTokenPayload {
  storagePath: string;
}

export interface CandidateInviteTokenPayload {
  candidateId: string;
  type: "candidate_invite";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function signEmailToken(payload: EmailTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EMAIL_TOKEN_EXPIRES_IN } as jwt.SignOptions);
}

// Short-lived, single-purpose token granting access to exactly one document
// storage path (SRS FR-1.6 "signed, time-limited access URLs").
export function signDocumentToken(payload: DocumentTokenPayload, expiresInSeconds: number): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyEmailToken(token: string): EmailTokenPayload {
  return jwt.verify(token, JWT_SECRET) as EmailTokenPayload;
}

export function verifyDocumentToken(token: string): DocumentTokenPayload {
  return jwt.verify(token, JWT_SECRET) as DocumentTokenPayload;
}

// Invites a recruiter-sourced lead to create their own account and link it
// to the Candidate record already gathered about them (SRS FR-2.1/FR-2.4 —
// self-service application submission). 7 days: field candidates may not
// have reliable connectivity the moment this is sent.
export function signCandidateInviteToken(candidateId: string): string {
  return jwt.sign({ candidateId, type: "candidate_invite" }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyCandidateInviteToken(token: string): CandidateInviteTokenPayload {
  return jwt.verify(token, JWT_SECRET) as CandidateInviteTokenPayload;
}
