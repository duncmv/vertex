import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitApplicationSchema, newCandidatePersonalInfoSchema } from "@/lib/validations";
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

  // Section 2 always comes from the request body — the same fields a
  // brand-new CIF submission collects — whether or not the submitter is
  // signed in. This route never reads or writes the Candidate/User
  // records at all (its entire point is zero CRM touches), so there's no
  // "already on file" shortcut to take here.
  const infoParsed = newCandidatePersonalInfoSchema.safeParse(parsed.data);
  if (!infoParsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: infoParsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const fullName = infoParsed.data.full_name;
  const email = infoParsed.data.email;
  const phone = infoParsed.data.phone;
  const nationality = infoParsed.data.nationality;
  const passportNumber = infoParsed.data.passport_number;

  const [job, country1, country2, country3, sector] = await Promise.all([
    parsed.data.job_id ? prisma.job.findUnique({ where: { id: parsed.data.job_id } }) : Promise.resolve(null),
    prisma.country.findUnique({ where: { id: parsed.data.preferred_country_1_id } }),
    parsed.data.preferred_country_2_id ? prisma.country.findUnique({ where: { id: parsed.data.preferred_country_2_id } }) : Promise.resolve(null),
    parsed.data.preferred_country_3_id ? prisma.country.findUnique({ where: { id: parsed.data.preferred_country_3_id } }) : Promise.resolve(null),
    prisma.sector.findUnique({ where: { id: parsed.data.preferred_sector_id } }),
  ]);
  if (!country1) return NextResponse.json({ error: "Preferred country (option 1) not found." }, { status: 404 });
  if (!sector) return NextResponse.json({ error: "Preferred type of work not found." }, { status: 404 });

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
      currentLocationCountry: parsed.data.current_location_country_name,
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
