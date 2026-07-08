import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { createCampaignSchema } from "@/lib/validations";

const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;
// SRS §2.2: "In-House Supervisor — sets criteria/targets, approves and
// controls campaigns" — campaign set-up is their (and Director/admin's)
// responsibility, not the recruiter/supervisor's.
const CAMPAIGN_MANAGER_ROLES = ["inhouse_supervisor", "director", "admin"] as const;

// GET /api/campaigns — every staff role can view (a recruiter needs to see
// what campaign targets apply to their work), only management can create.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...STAFF_ROLES]);
  if (guardRes) return guardRes;

  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      start_date: true,
      end_date: true,
      creator: { select: { id: true, full_name: true } },
      targets: {
        select: {
          id: true,
          metric: true,
          target_value: true,
          country: { select: { id: true, name: true } },
          region: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ data: campaigns });
}

// POST /api/campaigns — SRS FR-3.3.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...CAMPAIGN_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const { start_date, end_date, ...rest } = parsed.data;

  const campaign = await auditedPrisma(user!.userId).campaign.create({
    data: {
      ...rest,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      created_by: user!.userId,
    },
    select: { id: true, name: true, status: true, start_date: true, end_date: true },
  });

  return NextResponse.json({ data: campaign }, { status: 201 });
}
