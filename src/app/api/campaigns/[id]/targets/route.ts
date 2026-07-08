import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { createCampaignTargetSchema } from "@/lib/validations";

const CAMPAIGN_MANAGER_ROLES = ["inhouse_supervisor", "director", "admin"] as const;

// POST /api/campaigns/:id/targets — cascades a numeric target to a
// country, a region, or the whole campaign (SRS FR-3.3 "cascade them to
// countries/regions"). Not wrapped in auditedPrisma: CampaignTarget isn't
// in AUDITED_MODELS since it's a child row of an already-audited Campaign
// edit, not an independently meaningful audit event on its own.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...CAMPAIGN_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  const { id: campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: { code: "not_found", message: "Campaign not found." } }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = createCampaignTargetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const target = await prisma.campaignTarget.create({
    data: { ...parsed.data, campaign_id: campaignId },
    select: {
      id: true,
      metric: true,
      target_value: true,
      country: { select: { id: true, name: true } },
      region: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: target }, { status: 201 });
}
