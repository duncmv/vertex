import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Baseline reference data matching the regions already described on the
// public site (About page hubs: European Command, Middle East & Gulf
// Operations, Africa Regional Directorate). Admins can add more via the UI.
// Europe's country list is also the Candidate Information Form's "Preferred
// Programme / Country" dropdown (Section 1) — these are the programme
// destinations actually named in that form's Section 3 document checklist,
// plus the UK as Vertex's own operating base.
// Portugal, Spain and Czech Republic added alongside the original 2026-07
// list — they're 3 of the 15 work-permit programmes in the Service &
// Pricing List but were missing from this destination list entirely, so
// the CIF's country picker couldn't select them at all.
const REGIONS: Record<string, string[]> = {
  Europe: ["United Kingdom", "Poland", "Belarus", "Italy", "Hungary", "Romania", "Serbia", "Bulgaria", "Slovakia", "Germany", "Portugal", "Spain", "Czech Republic"],
  "Middle East & Gulf": ["United Arab Emirates", "Saudi Arabia", "Qatar"],
  Africa: ["Kenya", "Uganda", "Nigeria", "Ghana"],
};

// Default sector list drawn from the Candidate Information Form's "Preferred
// Type of Work" examples (warehouse, agriculture, hotel, driving) plus the
// programme documents referenced in its Section 3 checklist. Admin can add
// or rename these via the Sector management UI. "General Labour" added
// alongside the work-permit-programme Job seed below — several programmes
// (Portugal, Spain, Poland, Romania, Germany, all 4 Czech Republic tracks)
// are simply "Unskilled" with no more specific sector fit.
const SECTORS = ["Warehouse & Logistics", "Agriculture", "Hospitality & Hotel", "Driving", "Construction", "Manufacturing", "General Labour"];

// Baseline document requirement types (replaces the old fixed DocumentType
// enum) — admin can add more from the Sectors & Requirements page. Order
// and labels match the real Candidate Information Form's Section 3
// exactly; is_universal marks the 3 required for every programme
// regardless of destination.
const DOCUMENT_REQUIREMENT_TYPES: { key: string; label: string; is_universal?: boolean; sort_order: number }[] = [
  { key: "cv", label: "CV / Resume", is_universal: true, sort_order: 0 },
  { key: "passport", label: "Passport Copy — first page", is_universal: true, sort_order: 1 },
  { key: "all_passport_pages", label: "All Passport Pages (good quality)", sort_order: 2 },
  { key: "passport_photo", label: "Passport-Size Photos", is_universal: true, sort_order: 3 },
  { key: "national_id", label: "National ID Copy", sort_order: 4 },
  { key: "cv_europass", label: "CV in Europass format", sort_order: 5 },
  { key: "education_diploma", label: "Education Diploma", sort_order: 6 },
  { key: "police_clearance", label: "Criminal Record Certificate", sort_order: 7 },
  { key: "driving_licence", label: "Driving Licence — Category CE", sort_order: 8 },
  { key: "tachograph_card", label: "Tachograph Card + Code 95", sort_order: 9 },
  { key: "professional_training_certificate", label: "Professional Training Certificate", sort_order: 10 },
  { key: "e_apostille", label: "e-Apostille", sort_order: 11 },
  { key: "zab_recognition_letter", label: "ZAB Recognition Letter (skilled employees)", sort_order: 12 },
  // Broader Phase 4 mobility-lifecycle document set (not part of the CIF/
  // Agency self-report checklist — staff upload these ad hoc from a case).
  { key: "transcript", label: "Transcript", sort_order: 13 },
  { key: "certificate", label: "Certificate", sort_order: 14 },
  { key: "medical", label: "Medical Report", sort_order: 15 },
  { key: "contract", label: "Contract", sort_order: 16 },
  { key: "visa", label: "Visa", sort_order: 17 },
  { key: "other", label: "Other Document", sort_order: 18 },
];

// The 15 work-permit programmes from the Service & Pricing List (Work
// Permits sheet), seeded as real Job rows so they're the actual public
// /jobs listings rather than a separate hardcoded catalog — "Apply" on any
// of them carries job_id through to the Candidate Information Form
// (POST /api/applications already supports it end to end). Pricing is
// deliberately per-programme (per row here), not per-country: Czech
// Republic alone has 4 programmes at 4 different fees, so a country-keyed
// price table would be wrong. Every programme in the source guide follows
// the same fixed 20% / 40% / 40% (documentation / permit / visa) split of
// the total service fee — stage amounts are derived from service_fee_gbp
// at render time rather than stored, which also sidesteps a rounding
// error in the source spreadsheet's own Bulgaria row (its 380/740/740
// cells don't actually sum to its own stated 1900 GBP total; 20/40/40 of
// 1900 is 380/760/760).
const ACCOMMODATION_NOTE = "Accommodation is provided in every programme (may be deducted from salary).";
const JOBS: {
  title: string;
  country: string;
  category: string;
  salary_range: string;
  job_description: string;
  requirements: string;
  visa_type: string;
  duration_permit: string;
  processing_time: string;
  service_fee_gbp: number;
  visa_success_rates: string;
}[] = [
  {
    title: "Serbia — Warehouse Worker (6-Month Work Permit)",
    country: "Serbia",
    category: "Warehouse & Logistics",
    salary_range: "940 EUR / month",
    job_description: `Warehouse worker programme on a Visa D, with a 6-month engagement that can be extended via a temporary residence card (TRC). Documents process in around 2 months, with approval typically granted 1–3 months after registration. Employer-initiated official registration is included in the package. ${ACCOMMODATION_NOTE}`,
    requirements: "Passport, education diploma, and completed application form.",
    visa_type: "Visa D",
    duration_permit: "6 months · TRC possible",
    processing_time: "2 months documentation · 1–3 months approval wait after registration",
    service_fee_gbp: 1100,
    visa_success_rates: "Asia: above 90% · Africa: 90–95% · South America: above 95%",
  },
  {
    title: "Portugal — Unskilled Worker (12-Month Employment Contract)",
    country: "Portugal",
    category: "General Labour",
    salary_range: "870 EUR / month",
    job_description: `Unskilled work on a 12-month employment contract (Visa D1), processed in 90 working days with a scheduled embassy appointment. ${ACCOMMODATION_NOTE}`,
    requirements: "Photo of the first page of the passport.",
    visa_type: "Visa D1",
    duration_permit: "12-month employment contract",
    processing_time: "90 working days",
    service_fee_gbp: 1400,
    visa_success_rates: "Asia: 70–80% · Africa: 85–95% · South America: above 95%",
  },
  {
    title: "Italy — Agricultural Worker (2-Year Resident Card)",
    country: "Italy",
    category: "Agriculture",
    salary_range: "From 1,300 EUR / month",
    job_description: `Agricultural work on a Visa D with a 2-year resident card, processed in around 3 months — the strongest visa success profile in the programme lineup, above 95% in every applicant region. ${ACCOMMODATION_NOTE}`,
    requirements: "First page of the passport and CV in Europass format.",
    visa_type: "Visa D",
    duration_permit: "2-year resident card",
    processing_time: "3 months",
    service_fee_gbp: 2350,
    visa_success_rates: "Asia: above 95% · Africa: above 95% · South America: above 95%",
  },
  {
    title: "Hungary — Assistant Agronomist (6-Month Employment Contract)",
    country: "Hungary",
    category: "Agriculture",
    salary_range: "900–940 EUR / month",
    job_description: `Unskilled work as an assistant agronomist on a Visa D, with a 6-month employment contract processed in around 3 months. ${ACCOMMODATION_NOTE}`,
    requirements: "First page of the passport and CV in Europass format.",
    visa_type: "Visa D",
    duration_permit: "6-month employment contract",
    processing_time: "3 months",
    service_fee_gbp: 1400,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Slovakia — Truck Driver, Category CE (Skilled)",
    country: "Slovakia",
    category: "Driving",
    salary_range: "2,250 EUR / month",
    job_description: `Skilled work as a Category CE truck driver, with official employment and a 2-year residence permit on a Visa D — the highest fixed salary in the programme lineup. Documents (especially the Suglas) process in around 3 weeks; requires an embassy appointment. ${ACCOMMODATION_NOTE}`,
    requirements: "Passport; driving licence (Category CE); tachograph card; Code 95 (assistance with registration available if not already held).",
    visa_type: "Visa D",
    duration_permit: "Official employment + 2-year residence permit",
    processing_time: "3 weeks",
    service_fee_gbp: 1300,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Germany — Unskilled Worker (180-Day Visa + Resident Card)",
    country: "Germany",
    category: "General Labour",
    salary_range: "From 2,200 EUR / month",
    job_description: `Unskilled work on a Visa D, combining a 180-day visa with a 1–2 year resident card. Documents process in around 3 months. Skilled applicants should also prepare a ZAB recognition letter. ${ACCOMMODATION_NOTE}`,
    requirements: "Photo of the first page of the passport and CV. Skilled employees also need a ZAB recognition letter.",
    visa_type: "Visa D",
    duration_permit: "180-day visa + 1–2 year resident card",
    processing_time: "3 months",
    service_fee_gbp: 1800,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Spain — Unskilled Worker (12-Month Employment Contract)",
    country: "Spain",
    category: "General Labour",
    salary_range: "870 EUR / month",
    job_description: `Unskilled work on a 12-month employment contract (Visa D1), processed in 90 working days with a scheduled embassy appointment. ${ACCOMMODATION_NOTE}`,
    requirements: "Photo of the first page of the passport.",
    visa_type: "Visa D1",
    duration_permit: "12-month employment contract",
    processing_time: "90 working days",
    service_fee_gbp: 1400,
    visa_success_rates: "Asia: 70–80% · Africa: 85–95% · South America: above 95%",
  },
  {
    title: "Czech Republic — 3-Month Seasonal Work Permit",
    country: "Czech Republic",
    category: "General Labour",
    salary_range: "From 830 EUR / month",
    job_description: `Unskilled seasonal work on a Visa C for 3 months — the most affordable programme on offer, with one-document onboarding. Documents process in around 2 months. ${ACCOMMODATION_NOTE}`,
    requirements: "Photo of the first page of the passport.",
    visa_type: "Visa C",
    duration_permit: "3 months (seasonal)",
    processing_time: "2 months",
    service_fee_gbp: 600,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Czech Republic — 6-Month Seasonal Work Permit",
    country: "Czech Republic",
    category: "General Labour",
    salary_range: "From 830 EUR / month",
    job_description: `Unskilled seasonal work on a Visa D for 6 months — the middle step of the Czech seasonal ladder. Documents process in around 2 months. ${ACCOMMODATION_NOTE}`,
    requirements: "Photo of the first page of the passport.",
    visa_type: "Visa D",
    duration_permit: "6 months (seasonal)",
    processing_time: "2 months",
    service_fee_gbp: 800,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Czech Republic — 9-Month Seasonal Work Permit",
    country: "Czech Republic",
    category: "General Labour",
    salary_range: "From 830 EUR / month",
    job_description: `Unskilled seasonal work on a Visa D for 9 months — the longest seasonal engagement before the 2-year resident card track. Documents process in around 2 months. ${ACCOMMODATION_NOTE}`,
    requirements: "Photo of the first page of the passport.",
    visa_type: "Visa D",
    duration_permit: "9 months (seasonal)",
    processing_time: "2 months",
    service_fee_gbp: 900,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Czech Republic — 2-Year Resident Card",
    country: "Czech Republic",
    category: "General Labour",
    salary_range: "From 830 EUR / month",
    job_description: `Unskilled work on a Visa D with a 2-year resident card — the fastest documentation turnaround in the programme lineup. Documents process in around 3 months. ${ACCOMMODATION_NOTE}`,
    requirements: "Photo of the first page of the passport.",
    visa_type: "Visa D",
    duration_permit: "2-year resident card",
    processing_time: "3 months",
    service_fee_gbp: 1200,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Poland — Unskilled Worker (12- or 18-Month Work Permit)",
    country: "Poland",
    category: "General Labour",
    salary_range: "From 1,000 EUR / month",
    job_description: `Unskilled work on a Visa D, with a choice of 12-month or 18-month work permit. Official registration can be added for an extra 100 EUR. ${ACCOMMODATION_NOTE}`,
    requirements: "All pages of the passport, in good quality.",
    visa_type: "Visa D",
    duration_permit: "12-month or 18-month work permit",
    processing_time: "3 months (12-month permit) · 3–4 months (18-month permit)",
    service_fee_gbp: 1100,
    visa_success_rates: "Asia: 60–75% · Africa: 75–85% · South America: 75–85%",
  },
  {
    title: "Romania — Unskilled Worker (2-Year Resident Card)",
    country: "Romania",
    category: "General Labour",
    salary_range: "From 700 EUR / month",
    job_description: `Unskilled work on a Visa D with a 2-year resident card, processed in around 4 months. ${ACCOMMODATION_NOTE}`,
    requirements: "First page of the passport and CV in Europass format.",
    visa_type: "Visa D",
    duration_permit: "2-year resident card",
    processing_time: "4 months",
    service_fee_gbp: 1300,
    visa_success_rates: "Asia: 70–80% · Africa: 85–95% · South America: above 95%",
  },
  {
    title: "Bulgaria — Hotel Sector Worker (6-Month Contract)",
    country: "Bulgaria",
    category: "Hospitality & Hotel",
    salary_range: "750–1,400 EUR / month",
    job_description: `Unskilled hotel-sector work (hotel staff, kitchen assistant, housekeeping, or gardener assistant) on a Visa D. An initial visa is issued for up to 90 days, attached to a 6-month employment contract; documents process in 2–3 months. Salary depends on the exact position and working hours. ${ACCOMMODATION_NOTE}`,
    requirements: "Scanned copy of international passport, criminal record certificate, and CV.",
    visa_type: "Visa D",
    duration_permit: "Initial visa up to 90 days · 6-month contract",
    processing_time: "2–3 months",
    service_fee_gbp: 1900,
    visa_success_rates: "Asia: 70–80% · Africa: 85–95% · South America: above 95%",
  },
  {
    title: "Belarus — Production & Construction Vacancies (3-Year TRC)",
    country: "Belarus",
    category: "Construction",
    salary_range: "434–1,085 EUR / month",
    job_description: `Vacancies across General Worker (production), Painter, Plasterer/finishing, and Production Assistant (no experience required) roles on a Visa D. A 30-day entry visa is followed by a temporary residence card (TRC) valid for 3 years on arrival; requires an embassy appointment. Documents process in around 2 months. Salary depends on the exact vacancy. ${ACCOMMODATION_NOTE}`,
    requirements: "International passport, passport-size photos, national ID / personal data, professional training certificate, and e-Apostille.",
    visa_type: "Visa D",
    duration_permit: "30-day entry visa · TRC for 3 years on arrival",
    processing_time: "2 months",
    service_fee_gbp: 1200,
    visa_success_rates: "Asia: 85–95% · Africa: 85–95% · South America: 85–95%",
  },
];

async function main() {
  for (const t of DOCUMENT_REQUIREMENT_TYPES) {
    await prisma.documentRequirementType.upsert({
      where: { key: t.key },
      update: { label: t.label, is_universal: t.is_universal ?? false, sort_order: t.sort_order },
      create: { key: t.key, label: t.label, is_universal: t.is_universal ?? false, sort_order: t.sort_order },
    });
  }

  for (const [regionName, countries] of Object.entries(REGIONS)) {
    const region = await prisma.region.upsert({
      where: { name: regionName },
      update: {},
      create: { name: regionName },
    });

    for (const countryName of countries) {
      await prisma.country.upsert({
        where: { name: countryName },
        update: { region_id: region.id },
        create: { name: countryName, region_id: region.id },
      });
    }
  }

  for (const sectorName of SECTORS) {
    await prisma.sector.upsert({
      where: { name: sectorName },
      update: {},
      create: { name: sectorName },
    });
  }

  // Per-programme document requirements from the Candidate Information
  // Form's Section 3 checklist ("Required for: X"). Passport copy, passport
  // photos, and CV are required for every programme so aren't listed here —
  // only the country-specific extras are.
  const DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
    Poland: ["all_passport_pages"],
    Belarus: ["national_id", "professional_training_certificate", "e_apostille"],
    Italy: ["cv_europass"],
    Hungary: ["cv_europass"],
    Romania: ["cv_europass"],
    Serbia: ["education_diploma"],
    Bulgaria: ["police_clearance"],
    Slovakia: ["driving_licence", "tachograph_card"],
    Germany: ["zab_recognition_letter"],
  };
  for (const [countryName, documentTypes] of Object.entries(DOCUMENT_REQUIREMENTS)) {
    const country = await prisma.country.findUnique({ where: { name: countryName } });
    if (!country) continue;
    for (const document_type of documentTypes) {
      await prisma.countryDocumentRequirement.upsert({
        where: { country_id_document_type: { country_id: country.id, document_type } },
        update: {},
        create: { country_id: country.id, document_type },
      });
    }
  }

  // Job has no natural unique key beyond its cuid id, so this seed is kept
  // idempotent by title (find-then-create) rather than a Prisma upsert.
  for (const j of JOBS) {
    const existing = await prisma.job.findFirst({ where: { title: j.title } });
    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: {
          country: j.country,
          category: j.category,
          salary_range: j.salary_range,
          job_description: j.job_description,
          requirements: j.requirements,
          visa_type: j.visa_type,
          duration_permit: j.duration_permit,
          processing_time: j.processing_time,
          service_fee_gbp: j.service_fee_gbp,
          visa_success_rates: j.visa_success_rates,
        },
      });
    } else {
      await prisma.job.create({
        data: {
          title: j.title,
          country: j.country,
          city: "Nationwide",
          category: j.category,
          salary_range: j.salary_range,
          job_description: j.job_description,
          requirements: j.requirements,
          status: "active",
          application_fee: 0,
          visa_type: j.visa_type,
          duration_permit: j.duration_permit,
          processing_time: j.processing_time,
          service_fee_gbp: j.service_fee_gbp,
          visa_success_rates: j.visa_success_rates,
        },
      });
    }
  }

  console.log("Seed complete: regions, countries, sectors, document requirements, and work-permit programmes.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
