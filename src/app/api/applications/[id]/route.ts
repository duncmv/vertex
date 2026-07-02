import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateApplicationStatusSchema } from "@/lib/validations";
import { getAuthUser, requireAdmin } from "@/lib/api-auth";

// PUT /api/applications/[id] — admin updates status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateApplicationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const application = await prisma.application.update({
    where: { id },
    data: { application_status: parsed.data.application_status },
    include: {
      candidate: { include: { user: true } },
      job: true
    }
  });

  try {
    const { sendStatusUpdateEmail } = await import("@/lib/email");
    await sendStatusUpdateEmail(
      application.candidate.user.email,
      application.candidate.user.full_name,
      application.job.title,
      parsed.data.application_status
    );
  } catch (err) {
    console.error("Failed to send status update email.", err);
  }

  return NextResponse.json(application);
}

// GET /api/applications/[id] — admin or owner
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      candidate: { include: { user: { select: { full_name: true, email: true } } } },
      job: true,
    },
  });

  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  if (user.role !== "admin" && application.candidate.user_id !== user.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json(application);
}
