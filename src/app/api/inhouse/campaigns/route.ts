import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";

// GET /api/inhouse/campaigns — every campaign (any status, not just
// active), with only this In-House Supervisor's own country's targets
// attached (not every country/region's, unlike the Management campaigns
// view). Not filtered to "active" — In-House creates campaigns for their
// own country (SRS §2.2) which Country Supervisors then draw on, so they
// need to see and keep managing a campaign while it's still in draft,
// not just after someone else activates it.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["inhouse_supervisor", "admin"]);
  if (guardRes) return guardRes;

  const supervisor = await prisma.user.findUnique({
    where: { id: user!.userId },
    select: { assigned_country_id: true },
  });
  if (!supervisor?.assigned_country_id) {
    return NextResponse.json({ data: { countryId: null, campaigns: [] } });
  }

  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      start_date: true,
      end_date: true,
      created_by: true,
      targets: {
        where: { country_id: supervisor.assigned_country_id },
        select: { id: true, metric: true, target_value: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ data: { countryId: supervisor.assigned_country_id, userId: user!.userId, campaigns } });
}
