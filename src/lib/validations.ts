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

// Candidate profile
export const candidateProfileSchema = z.object({
  passport_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
});

// Jobs
export const createJobSchema = z.object({
  title: z.string().min(3).max(150),
  country: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  salary_range: z.string().optional(),
  job_description: z.string().min(50, "Job description must be at least 50 characters"),
  requirements: z.string().min(20, "Requirements must be at least 20 characters"),
  status: z.enum(["active", "closed", "draft"]).default("active"),
});

// Applications
export const submitApplicationSchema = z.object({
  job_id: z.string().cuid("Invalid job ID"),
  cover_letter: z.string().optional(),
  // Present when a recruiter/supervisor submits on behalf of a candidate
  // who has no account of their own yet (SRS FR-2.1) — otherwise the
  // authenticated candidate's own profile is used.
  candidate_id: z.string().cuid().optional(),
});

export const updateApplicationStatusSchema = z.object({
  application_status: z.enum(["submitted", "under_review", "interview", "approved", "rejected"]),
});

// Regions & Countries (SRS FR-1.4)
export const createRegionSchema = z.object({
  name: z.string().min(2).max(100),
});

export const createCountrySchema = z.object({
  name: z.string().min(2).max(100),
  region_id: z.string().cuid("Invalid region ID"),
});

// Staff role/supervisor/country assignment (SRS FR-1.1, FR-1.3, FR-1.4)
const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;
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

// Candidate registration by a recruiter (SRS FR-2.1) — pre-registration
// identity, since the person may not have their own account yet.
export const registerCandidateSchema = z.object({
  full_name: z.string().min(2).max(100),
  nationality: z.string().min(2).max(100),
  date_of_birth: z.string().optional(),
  passport_number: z.string().optional(),
  phone: z.string().optional(),
  email: optionalEmail,
  desired_role: z.string().max(150).optional(),
  country_id: z.string().cuid().optional(),
});

// Progressive candidate detail edits + consent (SRS FR-2.5, FR-2.8) — a
// recruiter fills in a lead's profile over time, not necessarily all at
// registration.
export const updateCandidateDetailsSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  nationality: z.string().min(2).max(100).optional(),
  date_of_birth: z.string().optional(),
  passport_number: z.string().optional(),
  phone: z.string().optional(),
  email: optionalEmail,
  desired_role: z.string().max(150).optional(),
  consent_given: z.boolean().optional(),
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
