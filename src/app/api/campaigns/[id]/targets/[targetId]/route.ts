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

  await prisma.campaignTarget.delete({ where: { id: targetId } });
  return NextResponse.json({ data: { id: targetId } });
}
