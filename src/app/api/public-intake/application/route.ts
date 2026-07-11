import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitApplicationSchema, newCandidatePersonalInfoSchema } from "@/lib/validations";
import { getAuthUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendPublicIntakeEmail, sendPublicIntakeConfirmationEmail } from "@/lib/email";

// POST /api/public-intake/application — the temporary bridge for the
// public Candidate Information Form while the site is live on the main
// domain ahead of the CRM's staff workflows being signed off (Admin
// Settings → Public Form Intake Mode). Deliberately writes nothing to the
// CRM (no Candidate/Application, no recruiter assignment) — it just emails
// PUBLIC_FORMS_NOTIFY_EMAIL the same information the CIF collects, plus a
// short confirmation to the applicant. Once staff flip the setting to
// "crm", ApplicationForm posts to /api/applications instead and this route
// stops being used by the public form (though it stays reachable).
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`public-intake:${ip}`, { max: 5, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = submitApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  // Identity: a signed-in candidate's details come from their own Candidate
  // record (already on file), never from the request body. Anyone else
  // (anonymous, or any non-candidate role landing on this public route)
  // must supply Section 2 themselves, same as a brand-new CIF submission.
  const user = await getAuthUser(req);
  let fullName: string;
  let email: string;
  let phone: string | undefined;
  let nationality: string | undefined;
  let passportNumber: string | undefined;

  if (user?.role === "candidate") {
    // full_name/email/phone on Candidate itself are only authoritative
    // pre-registration (user_id null) — once a User is linked, that
    // record wins instead (same fallback used across the app, e.g.
    // POST /api/applications' confirmation-email recipient lookup).
    const candidate = await prisma.candidate.findUnique({ where: { user_id: user.userId }, include: { user: true } });
    if (!candidate) return NextResponse.json({ error: "Candidate profile not found." }, { status: 404 });
    fullName = candidate.user?.full_name ?? candidate.full_name ?? "";
    email = candidate.user?.email ?? candidate.email ?? "";
    phone = candidate.user?.phone ?? candidate.phone ?? undefined;
    nationality = candidate.nationality ?? undefined;
    passportNumber = candidate.passport_number ?? undefined;
  } else {
    const infoParsed = newCandidatePersonalInfoSchema.safeParse(parsed.data);
    if (!infoParsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: infoParsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    fullName = infoParsed.data.full_name;
    email = infoParsed.data.email;
    phone = infoParsed.data.phone;
    nationality = infoParsed.data.nationality;
    passportNumber = infoParsed.data.passport_number;
  }

  const [job, country1, country2, country3, sector, currentLocationCountry] = await Promise.all([
    parsed.data.job_id ? prisma.job.findUnique({ where: { id: parsed.data.job_id } }) : Promise.resolve(null),
    prisma.country.findUnique({ where: { id: parsed.data.preferred_country_1_id } }),
    parsed.data.preferred_country_2_id ? prisma.country.findUnique({ where: { id: parsed.data.preferred_country_2_id } }) : Promise.resolve(null),
    parsed.data.preferred_country_3_id ? prisma.country.findUnique({ where: { id: parsed.data.preferred_country_3_id } }) : Promise.resolve(null),
    prisma.sector.findUnique({ where: { id: parsed.data.preferred_sector_id } }),
    prisma.country.findUnique({ where: { id: parsed.data.current_location_country_id } }),
  ]);
  if (!country1) return NextResponse.json({ error: "Preferred country (option 1) not found." }, { status: 404 });
  if (!sector) return NextResponse.json({ error: "Preferred type of work not found." }, { status: 404 });
  if (!currentLocationCountry) return NextResponse.json({ error: "Current location country not found." }, { status: 404 });

  // The email itself is the entire point of this endpoint — unlike other
  // notification emails in lib/email.ts, this one is not swallowed on
  // failure, so the applicant is told their submission didn't go through.
  try {
    await sendPublicIntakeEmail({
      fullName,
      email,
      phone,
      nationality,
      passportNumber,
      jobTitle: job?.title,
      preferredCountry1: country1.name,
      preferredCountry2: country2?.name,
      preferredCountry3: country3?.name,
      preferredSector: sector.name,
      earliestTravelDate: parsed.data.earliest_travel_date,
      priorEuVisaApplied: parsed.data.prior_eu_visa_applied,
      documentsAvailable: parsed.data.documents_available,
      currentLocationCountry: currentLocationCountry.name,
      holdsSchengenVisa: parsed.data.holds_schengen_visa,
      priorVisaRefusals: parsed.data.prior_visa_refusals,
      availableForEmbassyAppointment: parsed.data.available_for_embassy_appointment,
      willingToStartWithin30Days: parsed.data.willing_to_start_within_30_days,
      preferredContactChannel: parsed.data.preferred_contact_channel,
      coverLetter: parsed.data.cover_letter,
    });
  } catch (error) {
    console.error("Failed to send public-intake notification email:", error);
    return NextResponse.json({ error: "We couldn't submit your application right now. Please try again shortly or contact us directly." }, { status: 502 });
  }

  try {
    await sendPublicIntakeConfirmationEmail(email, fullName);
  } catch (error) {
    console.error("Failed to send public-intake confirmation email:", error);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
