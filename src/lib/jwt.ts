import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const EMAIL_TOKEN_EXPIRES_IN = process.env.EMAIL_TOKEN_EXPIRES_IN || "24h";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "candidate" | "admin";
}

export interface EmailTokenPayload {
  userId: string;
  email: string;
  type: "email_verification" | "password_reset";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function signEmailToken(payload: EmailTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EMAIL_TOKEN_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyEmailToken(token: string): EmailTokenPayload {
  return jwt.verify(token, JWT_SECRET) as EmailTokenPayload;
}
