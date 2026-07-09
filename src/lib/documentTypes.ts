// Human-readable labels for the DocumentType enum, matching the Candidate
// Information Form's Section 3 wording exactly. "Universal" types are
// required for every programme; the rest are only required for specific
// destination countries (admin-configured via CountryDocumentRequirement).
export const UNIVERSAL_DOCUMENT_TYPES = ["cv", "passport", "passport_photo"] as const;

// The programme-specific subset of the enum (Section 3's "Required for:
// X" rows) — what CountryDocumentRequirement picks from, in the form's
// own item order.
export const CIF_PROGRAMME_SPECIFIC_DOCUMENT_TYPES = [
  "all_passport_pages",
  "national_id",
  "cv_europass",
  "education_diploma",
  "police_clearance",
  "driving_licence",
  "tachograph_card",
  "professional_training_certificate",
  "e_apostille",
  "zab_recognition_letter",
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cv: "CV / Resume",
  passport: "Passport Copy — first page",
  passport_photo: "Passport-Size Photos",
  transcript: "Transcript",
  certificate: "Certificate",
  medical: "Medical Report",
  contract: "Contract",
  visa: "Visa",
  other: "Other Document",
  all_passport_pages: "All Passport Pages (good quality)",
  national_id: "National ID Copy",
  cv_europass: "CV in Europass format",
  education_diploma: "Education Diploma",
  police_clearance: "Criminal Record Certificate",
  driving_licence: "Driving Licence — Category CE",
  tachograph_card: "Tachograph Card + Code 95",
  professional_training_certificate: "Professional Training Certificate",
  e_apostille: "e-Apostille",
  zab_recognition_letter: "ZAB Recognition Letter (skilled employees)",
};

export function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}
