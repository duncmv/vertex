import { PrismaClient, DocumentType } from "@prisma/client";

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

async function main() {
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
  const DOCUMENT_REQUIREMENTS: Record<string, DocumentType[]> = {
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
