import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Baseline reference data matching the regions already described on the
// public site (About page hubs: European Command, Middle East & Gulf
// Operations, Africa Regional Directorate). Admins can add more via the UI.
// Europe's country list is also the Candidate Information Form's "Preferred
// Programme / Country" dropdown (Section 1) — these are the programme
// destinations actually named in that form's Section 3 document checklist,
// plus the UK as Vertex's own operating base.
const REGIONS: Record<string, string[]> = {
  Europe: ["United Kingdom", "Poland", "Belarus", "Italy", "Hungary", "Romania", "Serbia", "Bulgaria", "Slovakia", "Germany"],
  "Middle East & Gulf": ["United Arab Emirates", "Saudi Arabia", "Qatar"],
  Africa: ["Kenya", "Uganda", "Nigeria", "Ghana"],
};

// Default sector list drawn from the Candidate Information Form's "Preferred
// Type of Work" examples (warehouse, agriculture, hotel, driving) plus the
// programme documents referenced in its Section 3 checklist. Admin can add
// or rename these via the Sector management UI.
const SECTORS = ["Warehouse & Logistics", "Agriculture", "Hospitality & Hotel", "Driving", "Construction", "Manufacturing"];

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

  console.log("Seed complete: regions, countries, sectors, and document requirements.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
