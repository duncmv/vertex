import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";

const CAMPAIGN_MANAGER_ROLES = ["inhouse_supervisor", "director", "admin"] as const;

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; targetId: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...CAMPAIGN_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  const { id: campaignId, targetId } = await params;

  const target = await prisma.campaignTarget.findUnique({ where: { id: targetId } });
  if (!target || target.campaign_id !== campaignId) {
    return NextResponse.json({ error: { code: "not_found", message: "Target not found." } }, { status: 404 });
  }

  if (user!.role === "inhouse_supervisor") {
    const supervisor = await prisma.user.findUnique({ where: { id: user!.userId }, select: { assigned_country_id: true } });
    if (!supervisor?.assigned_country_id || target.country_id !== supervisor.assigned_country_id) {
      return NextResponse.json({ error: { code: "forbidden", message: "You can only remove targets for your own assigned country." } }, { status: 403 });
    }
  }

  await prisma.campaignTarget.delete({ where: { id: targetId } });
  return NextResponse.json({ data: { id: targetId } });
}
