import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAdmin } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

// GET /api/admin/candidates
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  try {
    const candidates = await prisma.user.findMany({
      where: { role: "candidate" },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        country: true,
        created_at: true,
        candidate: {
          select: {
            id: true,
            nationality: true,
            documents: { select: { id: true, type: true, verification_status: true } },
            _count: {
              select: { applications: true }
            }
          }
        }
      },
      orderBy: { created_at: "desc" }
    });

    return NextResponse.json(candidates);
  } catch (err) {
    console.error("Failed to fetch candidates:", err);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
