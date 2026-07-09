export const CASE_STAGE_ORDER = [
  "application_submitted",
  "verification",
  "offer_issued",
  "initial_payment",
  "permit_processing",
  "permit_delivered",
  "final_payment",
  "visa_application",
  "visa_guidance",
  "visa_approved",
  "travel_settlement",
] as const;

export type CaseStageKey = (typeof CASE_STAGE_ORDER)[number];

export const CASE_STAGE_LABELS: Record<CaseStageKey, string> = {
  application_submitted: "Application",
  verification: "Verification",
  offer_issued: "Offer Issued",
  initial_payment: "Initial Payment",
  permit_processing: "Permit Processing",
  permit_delivered: "Permit Delivered",
  final_payment: "Final Payment",
  visa_application: "Visa Application",
  visa_guidance: "Visa Guidance",
  visa_approved: "Visa Approved",
  travel_settlement: "Travel & Settlement",
};
