import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";

// GET /api/inhouse/campaigns — active campaigns with only this In-House
// Supervisor's own country's targets attached (not every country/region's,
// unlike the Management campaigns view) — everything the "set/edit my
// country's targets" page needs, pre-scoped server-side.
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
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      start_date: true,
      end_date: true,
      targets: {
        where: { country_id: supervisor.assigned_country_id },
        select: { id: true, metric: true, target_value: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ data: { countryId: supervisor.assigned_country_id, campaigns } });
}
