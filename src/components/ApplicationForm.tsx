"use client";

import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import { NON_PROGRAMME_TYPE_KEYS } from "@/lib/documentTypes";
import { WORLD_COUNTRIES } from "@/lib/worldCountries";

const WORLD_COUNTRY_OPTIONS = WORLD_COUNTRIES.map((name) => ({ value: name, label: name }));

interface Option {
  id: string;
  name: string;
}

interface DocumentTypeOption {
  key: string;
  label: string;
  is_universal: boolean;
}

interface Props {
  /** Present when staff is submitting on behalf of an existing candidate record (SRS FR-2.1). */
  candidateId?: string;
  onSubmitted: () => void;
  /** Renders a compact layout for embedding inside a portal panel rather than the full public page. */
  compact?: boolean;
  /**
   * Whether to render Section 2 (Personal Information) and the Candidate
   * Declaration inline — true for every genuine public self-service
   * submitter (anonymous, or a signed-in candidate) and a recruiter
   * entering a walk-in lead. False only for the narrower staff-on-behalf-
   * of-an-existing-candidate flow (candidateId set), where personal info
   * isn't collected by this form at all. Section 2's data is submitted as
   * part of this same POST either way — see initialProfile for prefilling
   * it from what's already on file.
   */
  includePersonalInfo?: boolean;
  /**
   * Set when arriving from a specific opportunity on /jobs (via
   * /apply?job=...) — carried through to POST /api/applications as
   * job_id, and used to preselect the matching country/sector below once
   * the options list has loaded.
   */
  jobId?: string;
  initialCountryName?: string;
  initialSectorName?: string;
  /**
   * Pre-fills Section 2 for a signed-in candidate from whatever's already
   * on file (registration details, or a prior partial save) — still
   * editable, and still submitted as part of this same POST alongside
   * Sections 1/3/4/5. The CIF treats every public self-service submitter
   * as supplying fresh Section 2 data every time, whether or not they
   * already have an account; there's no separate "update my profile"
   * request involved.
   */
  initialProfile?: Partial<{
    full_name: string;
    nationality: string;
    date_of_birth: string;
    passport_number: string;
    passport_expiry: string;
    second_nationality: string;
    current_occupation: string;
    highest_education: string;
    home_address: string;
    phone: string;
    whatsapp_number: string;
    email: string;
    marital_status: string;
  }>;
  /**
   * Only set by the public /apply page's two renders (signed-out and
   * signed-in-candidate) — RegisterCandidateForm (recruiter walk-in lead)
   * and PartnerCandidateForm never set this, so staff-entered submissions
   * always go straight into the CRM regardless of the admin's Public Form
   * Intake Mode setting. When set and the fetched mode is "email", submit
   * posts to /api/public-intake/application (no CRM writes, straight to
   * PUBLIC_FORMS_NOTIFY_EMAIL) instead of /api/applications.
   */
  useEmailIntakeIfConfigured?: boolean;
}

const emptyForm = {
  preferred_country_1_id: "",
  preferred_country_2_id: "",
  preferred_country_3_id: "",
  preferred_sector_id: "",
  earliest_travel_date: "",
  prior_eu_visa_applied: "",
  documents_available: [] as string[],

  full_name: "",
  nationality: "",
  date_of_birth: "",
  passport_number: "",
  passport_expiry: "",
  second_nationality: "",
  current_occupation: "",
  highest_education: "",
  home_address: "",
  phone: "",
  whatsapp_number: "",
  email: "",
  marital_status: "",

  payment_plan_acknowledged: false,

  current_location_country_name: "",
  holds_schengen_visa: "",
  prior_visa_refusals: "",
  available_for_embassy_appointment: false,
  willing_to_start_within_30_days: false,
  preferred_contact_channel: "" as "" | "email" | "whatsapp" | "phone",

  consent_given: false,
  cover_letter: "",
};

/**
 * The Candidate Information Form, in the same section order as the
 * original document (1, 2, 3, 4, 5, Declaration). Section 2 (Personal
 * Information) and the Candidate Declaration render whenever this is a
 * genuine public self-service submission (includePersonalInfo) — a signed-
 * in candidate is treated the same as a brand-new one here: their Section
 * 2 answers are submitted fresh as part of this one POST (pre-filled from
 * initialProfile if anything's already on file), not fetched-then-PUT
 * against an existing row beforehand, which is fragile exactly when
 * there's nothing on file yet (right after registering, the common case).
 * Section 3 only records which documents the candidate can provide
 * (checkboxes, self-reported) — actually uploading them happens later,
 * from the candidate's own dashboard, once an account exists. Shared by
 * the public /apply page, the recruiter's new-lead entry point, and the
 * narrower existing-candidate on-behalf flow, since all three submit
 * through the same POST /api/applications (or, while the CRM isn't live
 * yet for public traffic, POST /api/public-intake/application).
 */
export default function ApplicationForm({ candidateId, onSubmitted, compact, includePersonalInfo, jobId, initialCountryName, initialSectorName, initialProfile, useEmailIntakeIfConfigured }: Props) {
  const [countries, setCountries] = useState<Option[]>([]);
  const [locationCountries, setLocationCountries] = useState<Option[]>([]);
  const [recruiterCountryNames, setRecruiterCountryNames] = useState<string[]>([]);
  const [sectors, setSectors] = useState<Option[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [documentRequirements, setDocumentRequirements] = useState<{ country_id: string; document_type: string }[]>([]);
  // Defaults "email" so that if useEmailIntakeIfConfigured is set and
  // someone somehow submits before /api/apply/options resolves, the safe
  // failure mode is "email PUBLIC_FORMS_NOTIFY_EMAIL", not "silently write
  // into a CRM the business hasn't signed off on yet" — same fail-safe
  // reasoning as that route's own server-side default.
  const [intakeMode, setIntakeMode] = useState<"email" | "crm">("email");
  const [form, setForm] = useState(() => {
    // A plain {...emptyForm, ...initialProfile} spread would overwrite a
    // field with `undefined` whenever initialProfile has that key at all
    // (e.g. { full_name: profile.user?.full_name ?? undefined } always
    // has the key) — turning a controlled input's value from "" into
    // undefined and triggering React's controlled/uncontrolled warning.
    // Only fields with a real defined value should override emptyForm's "".
    const merged = { ...emptyForm };
    if (initialProfile) {
      for (const [key, value] of Object.entries(initialProfile)) {
        if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
      }
    }
    return merged;
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/apply/options")
      .then((r) => r.json())
      .then((res) => {
        setCountries(res.countries ?? []);
        setLocationCountries(res.locationCountries ?? []);
        setRecruiterCountryNames(res.recruiterCountryNames ?? []);
        setSectors(res.sectors ?? []);
        setDocumentTypes(res.documentTypes ?? []);
        setDocumentRequirements(res.documentRequirements ?? []);
        setIntakeMode(res.intakeMode === "email" ? "email" : "crm");
      })
      .catch(() => {});
  }, []);

  // Preselect the opportunity's country/sector once the real options have
  // loaded — name-matched rather than passing IDs directly, since the
  // caller (a /jobs page) only knows the Job's plain-text country/category
  // strings, not Country/Sector row IDs.
  useEffect(() => {
    if (!initialCountryName && !initialSectorName) return;
    setForm((f) => {
      const next = { ...f };
      if (initialCountryName && !f.preferred_country_1_id) {
        const match = countries.find((c) => c.name.toLowerCase() === initialCountryName.toLowerCase());
        if (match) next.preferred_country_1_id = match.id;
      }
      if (initialSectorName && !f.preferred_sector_id) {
        const match = sectors.find((s) => s.name.toLowerCase() === initialSectorName.toLowerCase());
        if (match) next.preferred_sector_id = match.id;
      }
      return next;
    });
  }, [countries, sectors, initialCountryName, initialSectorName]);

  // Section 3's checklist — a self-reported "can you provide this?" at
  // submission time, not the documents themselves (those are uploaded
  // later, from the candidate's own dashboard, once an account exists).
  // Admin-managed (DocumentRequirementType) rather than hardcoded, so a
  // type/requirement admin adds shows up here immediately.
  const documentChecklist = useMemo(
    () => documentTypes.filter((t) => !(NON_PROGRAMME_TYPE_KEYS as readonly string[]).includes(t.key)),
    [documentTypes]
  );
  const requiredForByType = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const req of documentRequirements) {
      const country = countries.find((c) => c.id === req.country_id);
      if (!country) continue;
      (map[req.document_type] ??= []).push(country.name);
    }
    return map;
  }, [documentRequirements, countries]);

  // The full world list, plus any of Vertex's own admin-managed
  // source-market countries that aren't already on it (a spelling variant,
  // or an admin-added country) — so an operational Country row is always
  // selectable here even if it doesn't match the static list exactly.
  const currentLocationOptions = useMemo(() => {
    const worldNames = new Set(WORLD_COUNTRIES.map((n) => n.toLowerCase()));
    const extra = locationCountries.filter((c) => !worldNames.has(c.name.toLowerCase()));
    return [...WORLD_COUNTRY_OPTIONS, ...extra.map((c) => ({ value: c.name, label: c.name }))];
  }, [locationCountries]);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleDocument = (type: string) =>
    setForm((f) => ({
      ...f,
      documents_available: f.documents_available.includes(type)
        ? f.documents_available.filter((t) => t !== type)
        : [...f.documents_available, type],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setFieldErrors({});

    // Even with the CRM active, a self-service submission whose current
    // location isn't one of Vertex's source-market countries with an
    // available Regional Recruiter has nobody to pick it up in the CRM —
    // fall back to the same email-intake bridge used while the CRM isn't
    // live at all, rather than silently creating an orphaned candidate.
    const hasRecruiterForCountry = recruiterCountryNames.some(
      (name) => name.toLowerCase() === form.current_location_country_name.toLowerCase()
    );
    const useEmailIntake = useEmailIntakeIfConfigured && (intakeMode === "email" || !hasRecruiterForCountry);
    const res = await fetch(useEmailIntake ? "/api/public-intake/application" : "/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        candidate_id: candidateId,
        job_id: jobId,
        preferred_country_2_id: form.preferred_country_2_id || undefined,
        preferred_country_3_id: form.preferred_country_3_id || undefined,
        preferred_contact_channel: form.preferred_contact_channel || undefined,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus("success");
      setMessage(
        includePersonalInfo
          ? "Thank you. We'll review your information and email you within 24 hours if you clear the screening stage."
          : "Application submitted successfully. We'll review it and confirm your programme within 48 hours."
      );
      onSubmitted();
    } else {
      setStatus("error");
      setMessage(data.error === "Validation failed" ? "Please check the highlighted fields." : (data.error || "Failed to submit application."));
      setFieldErrors(data.details ?? {});
    }
  };

  const err = (field: string) => fieldErrors[field]?.[0];

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h2 className="font-bold text-green-800 text-lg mb-1">Submitted!</h2>
        <p className="text-green-700 text-sm">{message}</p>
      </div>
    );
  }

  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
  const errCls = "text-xs text-red-600 mt-1";

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-6"}>
      <section>
        <h2 className="font-bold text-slate-800 mb-1">Section 1 — Programme Selection</h2>
        <p className="text-xs text-slate-500 mb-4">
          We ask for multiple programme options because vacancy availability and embassy capacity vary by country.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {(["preferred_country_1_id", "preferred_country_2_id", "preferred_country_3_id"] as const).map((key, i) => (
            <div key={key}>
              <label htmlFor={key} className={labelCls}>
                Preferred Country — Option {i + 1} {i === 0 && <span className="text-red-500">*</span>}
              </label>
              <SearchableSelect
                id={key}
                value={form[key]}
                onChange={(value) => set(key, value)}
                required={i === 0}
                placeholder={i === 0 ? "Select a country…" : "None"}
                options={countries.map((c) => ({ value: c.id, label: c.name }))}
              />
              {err(key) && <p className={errCls}>{err(key)}</p>}
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="preferred_sector_id" className={labelCls}>Preferred Type of Work <span className="text-red-500">*</span></label>
            <SearchableSelect
              id="preferred_sector_id"
              value={form.preferred_sector_id}
              onChange={(value) => set("preferred_sector_id", value)}
              required
              options={sectors.map((s) => ({ value: s.id, label: s.name }))}
            />
            {err("preferred_sector_id") && <p className={errCls}>{err("preferred_sector_id")}</p>}
          </div>
          <div>
            <label htmlFor="earliest_travel_date" className={labelCls}>Earliest Possible Travel Date <span className="text-red-500">*</span></label>
            <input
              id="earliest_travel_date"
              type="date"
              value={form.earliest_travel_date}
              onChange={(e) => set("earliest_travel_date", e.target.value)}
              required
              className="input-field"
            />
            {err("earliest_travel_date") && <p className={errCls}>{err("earliest_travel_date")}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className={labelCls}>Have you previously applied for an EU visa? <span className="text-slate-400 font-normal">(Yes / No / Where)</span></label>
          <input
            value={form.prior_eu_visa_applied}
            onChange={(e) => set("prior_eu_visa_applied", e.target.value)}
            placeholder="e.g. No, or Yes — Poland, 2024"
            className="input-field"
          />
        </div>
      </section>

      {includePersonalInfo && (
        <section className="border-t border-slate-200 pt-5">
          <h2 className="font-bold text-slate-800 mb-4">Section 2 — Candidate Personal Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className={labelCls}>Full Name (as per passport) <span className="text-red-500">*</span></label>
              <input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required className="input-field" />
              {err("full_name") && <p className={errCls}>{err("full_name")}</p>}
            </div>
            <div>
              <label htmlFor="date_of_birth" className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
              <input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} required className="input-field" />
              {err("date_of_birth") && <p className={errCls}>{err("date_of_birth")}</p>}
            </div>
            <div>
              <label htmlFor="nationality" className={labelCls}>Nationality <span className="text-red-500">*</span></label>
              <SearchableSelect
                id="nationality"
                value={form.nationality}
                onChange={(value) => set("nationality", value)}
                required
                placeholder="Select a country…"
                options={WORLD_COUNTRY_OPTIONS}
              />
              {err("nationality") && <p className={errCls}>{err("nationality")}</p>}
            </div>
            <div>
              <label className={labelCls}>Second Nationality (if any)</label>
              <SearchableSelect
                value={form.second_nationality}
                onChange={(value) => set("second_nationality", value)}
                placeholder="None"
                options={WORLD_COUNTRY_OPTIONS}
              />
            </div>
            <div>
              <label htmlFor="passport_number" className={labelCls}>Passport Number <span className="text-red-500">*</span></label>
              <input id="passport_number" value={form.passport_number} onChange={(e) => set("passport_number", e.target.value)} required className="input-field" />
              {err("passport_number") && <p className={errCls}>{err("passport_number")}</p>}
            </div>
            <div>
              <label htmlFor="passport_expiry" className={labelCls}>Passport Expiry Date <span className="text-slate-400 font-normal">(min. 6 months validity)</span> <span className="text-red-500">*</span></label>
              <input id="passport_expiry" type="date" value={form.passport_expiry} onChange={(e) => set("passport_expiry", e.target.value)} required className="input-field" />
              {err("passport_expiry") && <p className={errCls}>{err("passport_expiry")}</p>}
            </div>
            <div>
              <label className={labelCls}>Current Occupation</label>
              <input value={form.current_occupation} onChange={(e) => set("current_occupation", e.target.value)} className="input-field" />
            </div>
            <div>
              <label className={labelCls}>Highest Education / Qualification</label>
              <input value={form.highest_education} onChange={(e) => set("highest_education", e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>Phone Number (with country code) <span className="text-red-500">*</span></label>
              <input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} required className="input-field" />
              {err("phone") && <p className={errCls}>{err("phone")}</p>}
            </div>
            <div>
              <label className={labelCls}>WhatsApp Number</label>
              <input value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>Email Address <span className="text-red-500">*</span></label>
              <input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className="input-field" />
              {err("email") && <p className={errCls}>{err("email")}</p>}
            </div>
            <div>
              <label className={labelCls}>Marital Status</label>
              <input value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Complete Home Address</label>
              <input value={form.home_address} onChange={(e) => set("home_address", e.target.value)} className="input-field" />
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-slate-200 pt-5">
        <h2 className="font-bold text-slate-800 mb-1">Section 3 — Document Checklist</h2>
        <p className="text-xs text-slate-500 mb-4">
          Tick the documents you can provide. Items marked with a programme name are only required for that
          programme — your manager will confirm your exact document set. You don't need to upload anything yet;
          once you've cleared screening and created your account, you'll upload these from your own dashboard.
        </p>
        <div className="space-y-2">
          {documentChecklist.map((doc) => (
            <label key={doc.key} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.documents_available.includes(doc.key)}
                onChange={() => toggleDocument(doc.key)}
                className="w-4 h-4 mt-0.5"
              />
              <span>
                {doc.label}
                {!doc.is_universal && requiredForByType[doc.key]?.length > 0 && (
                  <span className="block text-xs text-emerald-700">Required for: {requiredForByType[doc.key].join(" · ")}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <h2 className="font-bold text-slate-800 mb-3">Section 4 — Payment Plan Acknowledgement</h2>
        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="font-bold text-emerald-700 mb-1">Stage 1 · 20%</div>
            <div className="text-slate-500">On engagement — documentation stage</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="font-bold text-emerald-700 mb-1">Stage 2 · 40%</div>
            <div className="text-slate-500">After the work permit is issued</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="font-bold text-emerald-700 mb-1">Stage 3 · 40%</div>
            <div className="text-slate-500">After the visa is granted</div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Air tickets and embassy fees are not included in any programme price and are payable separately.
          Accommodation is provided in every programme and may be deducted from salary by the employer.
        </p>
        <label className="flex items-start gap-2 text-sm text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={form.payment_plan_acknowledged}
            onChange={(e) => set("payment_plan_acknowledged", e.target.checked)}
            required
            className="w-4 h-4 mt-0.5"
          />
          I understand the payment plan above. <span className="text-red-500">*</span>
        </label>
        {err("payment_plan_acknowledged") && <p className={errCls}>{err("payment_plan_acknowledged")}</p>}
      </section>

      <section className="border-t border-slate-200 pt-5">
        <h2 className="font-bold text-slate-800 mb-4">Section 5 — Visa & Travel Readiness</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="current_location_country_name" className={labelCls}>Current Location (country) <span className="text-red-500">*</span></label>
            <SearchableSelect
              id="current_location_country_name"
              value={form.current_location_country_name}
              onChange={(value) => set("current_location_country_name", value)}
              required
              placeholder="Select a country…"
              options={currentLocationOptions}
            />
            {err("current_location_country_name") && <p className={errCls}>{err("current_location_country_name")}</p>}
          </div>
          <div>
            <label className={labelCls}>Do you currently hold any Schengen / EU visa?</label>
            <input
              value={form.holds_schengen_visa}
              onChange={(e) => set("holds_schengen_visa", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className={labelCls}>Previous visa refusals <span className="text-slate-400 font-normal">(country & year, if any)</span></label>
            <input
              value={form.prior_visa_refusals}
              onChange={(e) => set("prior_visa_refusals", e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="preferred_contact_channel" className={labelCls}>Preferred contact channel <span className="text-red-500">*</span></label>
            <SearchableSelect
              id="preferred_contact_channel"
              value={form.preferred_contact_channel}
              onChange={(value) => set("preferred_contact_channel", value as typeof form.preferred_contact_channel)}
              required
              options={[
                { value: "email", label: "Email" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "phone", label: "Phone" },
              ]}
            />
            {err("preferred_contact_channel") && <p className={errCls}>{err("preferred_contact_channel")}</p>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.available_for_embassy_appointment}
              onChange={(e) => set("available_for_embassy_appointment", e.target.checked)}
              className="w-4 h-4"
            />
            Available for an embassy appointment?
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.willing_to_start_within_30_days}
              onChange={(e) => set("willing_to_start_within_30_days", e.target.checked)}
              className="w-4 h-4"
            />
            Willing to start within 30 days of visa issue?
          </label>
        </div>
      </section>

      <div>
        <label className={labelCls}>
          Anything else you'd like to tell us? <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.cover_letter}
          onChange={(e) => set("cover_letter", e.target.value)}
          rows={3}
          className="input-field resize-none"
        />
      </div>

      {includePersonalInfo && (
        <section className="border-t border-slate-200 pt-5">
          <h2 className="font-bold text-slate-800 mb-2">Candidate Declaration</h2>
          <p className="text-xs text-slate-500 mb-3">
            I confirm that the information provided in this form is true and complete to the best of my knowledge,
            and I understand that prices and conditions may vary depending on the type of vacancy and country, and
            that air tickets and embassy fees are not included in the programme price.
          </p>
          <label className="flex items-start gap-2 text-sm text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={form.consent_given}
              onChange={(e) => set("consent_given", e.target.checked)}
              required
              className="w-4 h-4 mt-0.5"
            />
            I confirm the above. <span className="text-red-500">*</span>
          </label>
          {err("consent_given") && <p className={errCls}>{err("consent_given")}</p>}
        </section>
      )}

      {message && status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{message}</div>
      )}

      <button type="submit" disabled={status === "loading"} className="btn-gold w-full text-base py-3.5 disabled:opacity-60">
        {status === "loading" ? "Submitting…" : "Submit Application"}
      </button>
    </form>
  );
}
