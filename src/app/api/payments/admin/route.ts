import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  if (user!.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    include: {
      user: { select: { full_name: true, email: true } },
      job: { select: { title: true } }
    },
    orderBy: { created_at: "desc" }
  });

  return NextResponse.json(payments);
}
