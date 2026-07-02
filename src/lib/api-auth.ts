import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JwtPayload } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function getAuthUser(req: NextRequest): Promise<JwtPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(user: JwtPayload | null): NextResponse | null {
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }
  return null;
}

export function requireAdmin(user: JwtPayload | null): NextResponse | null {
  const authError = requireAuth(user);
  if (authError) return authError;
  if (user!.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }
  return null;
}
