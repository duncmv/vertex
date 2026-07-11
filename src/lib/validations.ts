import { z } from "zod";

// Treats an empty string as "not provided" before validating an optional
// field's format — otherwise z.string().email().optional() rejects "" from
// an untouched form input, since .optional() only short-circuits undefined.
const optionalEmail = z.preprocess((val) => (val === "" ? undefined : val), z.string().email().optional());

// Auth
export const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  country: z.string().optional(),
  // Present when arriving via a recruiter's candidate-invite email (SRS
  // FR-2.1) — links this new account to the existing recruiter-sourced
  // Candidate record instead of creating a fresh, empty one.
  invite: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Candidate profile — Section 2 of the Candidate Information Form
// ("Candidate Personal Information"), self-service edit path.
export const candidateProfileSchema = z.object({
  passport_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  second_nationality: z.string().max(100).optional(),
  passport_expiry: z.string().optional(),
  current_occupation: z.string().max(150).optional(),
  highest_education: z.string().max(150).optional(),
  home_address: z.string().max(500).optional(),
  whatsapp_number: z.string().max(30).optional(),
  marital_status: z.string().max(50).optional(),
});

// Jobs
export const createJobSchema = z.object({
  title: z.string().min(3).max(150),
  country: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  category: z.string().optional(),
  salary_range: z.string().optional(),
  job_description: z.string().min(50, "Job description must be at least 50 characters"),
  requirements: z.string().min(20, "Requirements must be at least 20 characters"),
  status: z.enum(["active", "closed", "draft"]).default("active"),
  employer_client_id: z.string().cuid().optional(),
  // Work-permit programme / pricing fields (Service & Pricing List) — all
  // optional since a plain employer job posting (SRS FR-5.2) has none of
  // these. service_fee_gbp is the total; the 20/40/40 stage split is
  // derived at render time, not stored (see prisma/seed.ts).
  visa_type: z.string().optional(),
  duration_permit: z.string().optional(),
  processing_time: z.string().optional(),
  service_fee_gbp: z.number().positive().optional(),
  visa_success_rates: z.string().optional(),
});

// Applications — the Candidate Information Form: the first thing a
// candidate (or a recruiter on a walk-in lead's behalf) ever fills in, not
// an application to a specific job listing (jobs aren't listed on the
// platform yet — job_id stays optional for when real job matching
// exists). Submitting this is what creates the Candidate record itself
// when there isn't one yet (anonymous self-service, or a recruiter
// entering a brand-new lead) — see POST /api/applications for exactly
// when the Section 2 fields below are actually required; they're all
// optional here since they're irrelevant when completing an existing
// candidate's form.
export const submitApplicationSchema = z.object({
  job_id: z.string().cuid("Invalid job ID").optional(),
  cover_letter: z.string().optional(),
  // Present when staff submits on behalf of an existing candidate record
  // (SRS FR-2.1) — otherwise the authenticated candidate's own profile is
  // used, or (if neither applies) a brand-new Candidate is created.
  candidate_id: z.string().cuid().optional(),

  // Section 2 — Candidate Personal Information. Required only when this
  // submission creates a brand-new Candidate.
  full_name: z.string().min(2).max(100).optional(),
  nationality: z.string().min(2).max(100).optional(),
  date_of_birth: z.string().optional(),
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  second_nationality: z.string().max(100).optional(),
  current_occupation: z.string().max(150).optional(),
  highest_education: z.string().max(150).optional(),
  home_address: z.string().max(500).optional(),
  phone: z.string().optional(),
  whatsapp_number: z.string().max(30).optional(),
  email: optionalEmail,
  marital_status: z.string().max(50).optional(),
  // The form's own "Candidate Declaration" ("I confirm the information
  // provided is true and complete") — the consent capture point for a
  // brand-new candidate; an existing lead may already have consent on
  // file from a recruiter's separate capture.
  consent_given: z.boolean().optional(),

  // Section 1 — Programme Selection. Up to 3 alternatives are requested
  // because vacancy/embassy capacity varies by country.
  preferred_country_1_id: z.string().cuid("Select your preferred country"),
  preferred_country_2_id: z.string().cuid().optional(),
  preferred_country_3_id: z.string().cuid().optional(),
  preferred_sector_id: z.string().cuid("Select your preferred type of work"),
  earliest_travel_date: z.string().min(1, "Earliest possible travel date is required"),
  prior_eu_visa_applied: z.string().max(500).optional(),

  // Section 3 — Document Checklist: self-reported "can you provide this?"
  // at submission time, not the documents themselves — those are
  // uploaded later from the candidate's own dashboard once an account
  // exists.
  documents_available: z.array(z.string().min(1).max(60)).default([]),

  // Section 5 — Visa & Travel Readiness. current_location_country_id also
  // drives round-robin recruiter assignment for a self-service submission.
  current_location_country_id: z.string().cuid("Select your current location"),
  holds_schengen_visa: z.string().max(200).optional(),
  prior_visa_refusals: z.string().max(500).optional(),
  available_for_embassy_appointment: z.boolean().default(false),
  willing_to_start_within_30_days: z.boolean().default(false),
  preferred_contact_channel: z.enum(["email", "whatsapp", "phone"]).optional(),

  // Section 4 — Payment Plan Acknowledgement: must be explicitly ticked to submit.
  payment_plan_acknowledged: z.literal(true, {
    message: "You must acknowledge the payment plan to submit.",
  }),
});

// The subset of submitApplicationSchema's Section 2 fields required when
// a Candidate Information Form submission creates a brand-new Candidate
// (no candidate_id, no logged-in candidate profile) — checked in the
// route handler rather than baked into submitApplicationSchema itself,
// since these fields are meaningless when completing an existing
// candidate's form.
export const newCandidatePersonalInfoSchema = z.object({
  full_name: z.string().min(2, "Full name is required").max(100),
  nationality: z.string().min(2, "Nationality is required").max(100),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  passport_number: z.string().min(1, "Passport number is required"),
  passport_expiry: z.string().min(1, "Passport expiry date is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  consent_given: z.literal(true, { message: "You must confirm the candidate declaration to submit." }),
});

export const updateApplicationStatusSchema = z.object({
  application_status: z.enum(["submitted", "under_review", "interview", "approved", "rejected"]),
});

// Regions & Countries (SRS FR-1.4)
export const createRegionSchema = z.object({
  name: z.string().min(2).max(100),
});

export const updateRegionSchema = z.object({
  name: z.string().min(2).max(100),
});

export const createCountrySchema = z.object({
  name: z.string().min(2).max(100),
  region_id: z.string().cuid("Invalid region ID"),
});

export const updateCountrySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  region_id: z.string().cuid("Invalid region ID").optional(),
});

// Sectors ("Preferred Type of Work" on the Candidate Information Form) and
// per-country document requirements (Section 3's "Required for: X" tags) —
// both admin-configurable reference data, same pattern as Region/Country.
export const createSectorSchema = z.object({
  name: z.string().min(2).max(100),
});

export const updateCountryDocumentRequirementsSchema = z.object({
  document_types: z.array(z.string().min(1).max(60)),
});

// Admin-managed document requirement types (replaces the old fixed
// DocumentType enum) — `key` is derived server-side by slugifying the
// label, not supplied directly, so admin only ever thinks in labels.
export const createDocumentRequirementTypeSchema = z.object({
  label: z.string().min(2).max(150),
});

// Staff role/supervisor/country assignment (SRS FR-1.1, FR-1.3, FR-1.4) —
// every role assignable via the admin staff directory. Deliberately wider
// than lib/rbac.ts's STAFF_ROLES (which governs the three-tier candidate
// hierarchy specifically): "marketing" is a real, assignable staff role
// but sits outside that hierarchy entirely.
const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "marketing", "admin"] as const;
export const updateStaffUserSchema = z.object({
  role: z.enum(STAFF_ROLES).optional(),
  supervisor_id: z.string().cuid().nullable().optional(),
  assigned_country_id: z.string().cuid().nullable().optional(),
});

export const createStaffUserSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(STAFF_ROLES),
  supervisor_id: z.string().cuid().nullable().optional(),
  assigned_country_id: z.string().cuid().nullable().optional(),
});

// Document verification (SRS FR-2.7, part of the Document model's
// verification_status/verified_by/verified_at added in Phase 1)
export const verifyDocumentSchema = z.object({
  verification_status: z.enum(["verified", "rejected"]),
});

// Progressive candidate detail edits + consent (SRS FR-2.5, FR-2.8) — a
// recruiter fills in a lead's profile over time, not necessarily all at
// registration. Also covers Section 2 of the Candidate Information Form
// for a recruiter-sourced lead who has no account of their own to edit it.
export const updateCandidateDetailsSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  nationality: z.string().min(2).max(100).optional(),
  date_of_birth: z.string().optional(),
  passport_number: z.string().optional(),
  phone: z.string().optional(),
  email: optionalEmail,
  desired_role: z.string().max(150).optional(),
  consent_given: z.boolean().optional(),
  second_nationality: z.string().max(100).optional(),
  passport_expiry: z.string().optional(),
  current_occupation: z.string().max(150).optional(),
  highest_education: z.string().max(150).optional(),
  home_address: z.string().max(500).optional(),
  whatsapp_number: z.string().max(30).optional(),
  marital_status: z.string().max(50).optional(),
});

// Candidate lifecycle status transitions (SRS FR-2.4, FR-2.5, FR-2.7)
const CANDIDATE_LIFECYCLE_STATUSES = [
  "identified",
  "screened",
  "guided_to_apply",
  "submitted",
  "reported",
  "verified",
  "approved",
] as const;
export const updateCandidateStatusSchema = z.object({
  lifecycle_status: z.enum(CANDIDATE_LIFECYCLE_STATUSES),
  return_reason: z.string().min(5).max(1000).optional(),
});

// Campaign set-up (SRS FR-3.3) — criteria is free-form (roles, quotas,
// eligibility rules vary by destination market), so it's validated as a
// generic JSON-serializable record rather than a fixed shape.
export const createCampaignSchema = z
  .object({
    name: z.string().min(3).max(150),
    criteria: z.record(z.string(), z.unknown()).default({}),
    start_date: z.string(),
    end_date: z.string(), // a campaign has a bounded timeline (SRS FR-3.3), not an open-ended one
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "End date must be after the start date.",
    path: ["end_date"],
  });

export const updateCampaignSchema = z.object({
  name: z.string().min(3).max(150).optional(),
  criteria: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const createCampaignTargetSchema = z
  .object({
    metric: z.enum(["agent_signups", "applicant_flow", "conversion_rate"]),
    country_id: z.string().cuid().optional(),
    region_id: z.string().cuid().optional(),
    target_value: z.number().positive(),
  })
  .refine((data) => !(data.country_id && data.region_id), {
    message: "A target can be scoped to a country or a region, not both.",
  });

// Reporting cycle (SRS FR-3.4) — a recruiter submits daily/weekly reports;
// a supervisor consolidates verified recruiter reports (child_report_ids)
// into a country report. `content` is free-form JSON since it snapshots
// whatever the submitter reports at the time (candidate list, notes,
// KPI summary) rather than a fixed schema.
export const submitReportSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly"]),
  period_start: z.string(),
  period_end: z.string(),
  content: z.record(z.string(), z.unknown()).default({}),
  child_report_ids: z.array(z.string().cuid()).optional(),
});

export const returnReportSchema = z.object({
  return_reason: z.string().min(5).max(1000),
});

// Contact form
export const contactFormSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(2000),
});

// ── Phase 4: Extended Mobility Lifecycle ────────────────────────────────

const CASE_STAGES = [
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

export const advanceCaseStageSchema = z.object({
  stage: z.enum(CASE_STAGES),
  notes: z.string().max(2000).optional(),
  // Staff-entered expected completion of the stage being entered (FR-4.4)
  // — never system-computed from an assumed SLA, since none is specified.
  stage_deadline: z.string().optional(),
});

export const createContractSchema = z.object({
  content: z.string().min(20).max(20000),
});

export const signContractSchema = z.object({
  signed_by_name: z.string().min(2).max(200),
});

// The 3-stage plan from the Candidate Information Form: documentation
// (Stage 1 · 20%, on engagement), permit (Stage 2 · 40%, after the work
// permit is issued), visa (Stage 3 · 40%, after the visa is granted).
export const recordCasePaymentSchema = z.object({
  type: z.enum(["documentation", "permit", "visa"]),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  receipt_reference: z.string().max(200).optional(),
});

export const updateFeePolicySchema = z.object({
  country_id: z.string().cuid().nullish(),
  enabled: z.boolean(),
  documentation_amount: z.number().positive().nullish(),
  permit_amount: z.number().positive().nullish(),
  visa_amount: z.number().positive().nullish(),
  currency: z.string().length(3).default("USD"),
});

export const completeRetentionFollowUpSchema = z.object({
  notes: z.string().max(2000).optional(),
});

// Phase 5: Partner CRM (SRS FR-5.1) — travel agencies, visa consultancies,
// manpower suppliers. Partners get their own admin-provisioned login and
// submit candidates themselves (see provisionPartnerAccountSchema and
// submitPartnerCandidateSchema below).
const PARTNER_TYPES = ["travel_agency", "visa_consultancy", "manpower_supplier", "other"] as const;
export const createPartnerSchema = z.object({
  name: z.string().min(2, "Name is required").max(150),
  partner_type: z.enum(PARTNER_TYPES),
  country_of_operation: z.string().min(2, "Country of operation is required").max(100),
  business_registration_number: z.string().max(100).optional(),
  contact_name: z.string().min(2, "Contact name is required").max(150),
  contact_email: z.string().email("A valid contact email is required"),
  contact_phone: z.string().min(3, "Contact phone is required").max(30),
  notes: z.string().max(2000).optional(),
});

export const updatePartnerSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  partner_type: z.enum(PARTNER_TYPES).optional(),
  country_of_operation: z.string().min(2).max(100).optional(),
  business_registration_number: z.string().max(100).nullish(),
  contact_name: z.string().min(2).max(150).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().min(3).max(30).optional(),
  status: z.enum(["pending", "active", "suspended"]).optional(),
  mou_status: z.enum(["none", "sent", "signed"]).optional(),
  notes: z.string().max(2000).nullish(),
});

// Admin provisions a Partner's own login (SRS FR-5.1) — email defaults to
// the Partner's contact_email but can be overridden (e.g. a different
// person handles the account than the primary business contact).
export const provisionPartnerAccountSchema = z.object({
  email: z.string().email().optional(),
});

// A partner submitting a candidate through its own portal (SRS FR-5.1) —
// the Agency Application Form's Sections 2-6 (Section 1, Agency
// Information, is already on file on the Partner record itself, not
// per-submission). Every field here is for a brand-new candidate — unlike
// submitApplicationSchema, there's no "existing candidate resubmitting"
// case, so personal-info fields are required, not conditional.
export const submitPartnerCandidateSchema = z.object({
  full_name: z.string().min(2, "Full name is required").max(100),
  nationality: z.string().min(2, "Nationality is required").max(100),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  passport_number: z.string().min(1, "Passport number is required"),
  passport_expiry: z.string().min(1, "Passport expiry date is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  second_nationality: z.string().max(100).optional(),
  current_occupation: z.string().max(150).optional(),
  highest_education: z.string().max(150).optional(),
  home_address: z.string().max(500).optional(),
  whatsapp_number: z.string().max(30).optional(),
  marital_status: z.string().max(50).optional(),

  preferred_country_1_id: z.string().cuid("Select the candidate's preferred country"),
  preferred_country_2_id: z.string().cuid().optional(),
  preferred_country_3_id: z.string().cuid().optional(),
  preferred_sector_id: z.string().cuid("Select the candidate's preferred type of work"),
  earliest_travel_date: z.string().min(1, "Earliest possible travel date is required"),
  prior_eu_visa_applied: z.string().max(500).optional(),

  documents_available: z.array(z.string().min(1).max(60)).default([]),

  payment_plan_acknowledged: z.literal(true, {
    message: "You must acknowledge the payment plan to submit.",
  }),

  current_location_country_id: z.string().cuid("Select the candidate's current location"),
  holds_schengen_visa: z.string().max(200).optional(),
  prior_visa_refusals: z.string().max(500).optional(),
  available_for_embassy_appointment: z.boolean().default(false),
  willing_to_start_within_30_days: z.boolean().default(false),
  preferred_contact_channel: z.enum(["email", "whatsapp", "phone"]).optional(),
});

// Phase 5: Employer/Client CRM (SRS FR-5.2) — the employer a vacancy is
// actually for, distinct from Partner (which sources candidates, not jobs).
export const createEmployerClientSchema = z.object({
  name: z.string().min(2, "Name is required").max(150),
  country: z.string().min(2, "Country is required").max(100),
  industry: z.string().max(100).optional(),
  contact_name: z.string().min(2, "Contact name is required").max(150),
  contact_email: z.string().email("A valid contact email is required"),
  contact_phone: z.string().min(3, "Contact phone is required").max(30),
  notes: z.string().max(2000).optional(),
});

export const updateEmployerClientSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  country: z.string().min(2).max(100).optional(),
  industry: z.string().max(100).nullish(),
  contact_name: z.string().min(2).max(150).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().min(3).max(30).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().max(2000).nullish(),
});

// Public contact form (/contact) — always emails PUBLIC_FORMS_NOTIFY_EMAIL
// regardless of the intake_mode setting; there's no CRM-side equivalent of
// a general enquiry to gate.
export const contactMessageSchema = z.object({
  name: z.string().min(2, "Name is required").max(150),
  email: z.string().email("A valid email is required"),
  subject: z.string().min(2, "Subject is required").max(200),
  message: z.string().min(10, "Message is required").max(5000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
