"use client";

import { useEffect, useState } from "react";

interface Option {
  id: string;
  name: string;
}

interface Props {
  /** Present when staff is submitting on behalf of an existing candidate record (SRS FR-2.1). */
  candidateId?: string;
  onSubmitted: () => void;
  /** Renders a compact layout for embedding inside a portal panel rather than the full public page. */
  compact?: boolean;
  /**
   * Whether this submission creates a brand-new Candidate — true for an
   * anonymous self-service submitter or a recruiter entering a walk-in
   * lead, false when completing/resubmitting an existing candidate's form
   * (personal info is already on file in that case).
   */
  includePersonalInfo?: boolean;
  /** Attributes a brand-new candidate to this sourcing partner (SRS FR-5.1) — staff-only. */
  partnerId?: string;
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

  current_location_country_id: "",
  holds_schengen_visa: "",
  prior_visa_refusals: "",
  available_for_embassy_appointment: false,
  willing_to_start_within_30_days: false,
  preferred_contact_channel: "" as "" | "email" | "whatsapp" | "phone",

  consent_given: false,
  cover_letter: "",
};

// Section 3's exact checklist — a self-reported "can you provide this?"
// at submission time, not the documents themselves (those are uploaded
// later, from the candidate's own dashboard, once an account exists).
// Matches the form's own item order and "Required for: X" annotations.
const DOCUMENT_CHECKLIST: { type: string; label: string; requiredFor?: string }[] = [
  { type: "passport", label: "Passport Copy — first page (clear, coloured)" },
  { type: "all_passport_pages", label: "All Passport Pages in good quality", requiredFor: "Poland" },
  { type: "passport_photo", label: "Passport-Size Photos (white background)" },
  { type: "national_id", label: "National ID Copy / personal data", requiredFor: "Belarus" },
  { type: "cv_europass", label: "CV in Europass format", requiredFor: "Italy · Hungary · Romania" },
  { type: "education_diploma", label: "Education Diploma", requiredFor: "Serbia" },
  { type: "police_clearance", label: "Criminal Record Certificate", requiredFor: "Bulgaria" },
  { type: "driving_licence", label: "Driving Licence — Category CE", requiredFor: "Slovakia" },
  { type: "tachograph_card", label: "Tachograph Card + Code 95 (assistance available)", requiredFor: "Slovakia" },
  { type: "professional_training_certificate", label: "Professional Training Certificate", requiredFor: "Belarus" },
  { type: "e_apostille", label: "e-Apostille", requiredFor: "Belarus" },
  { type: "zab_recognition_letter", label: "ZAB Recognition Letter (skilled employees)", requiredFor: "Germany" },
];

/**
 * The Candidate Information Form, in the same section order as the
 * original document (1, 2, 3, 4, 5, Declaration). Section 2 (Personal
 * Information) and the Candidate Declaration only render when this
 * submission is creating a brand-new Candidate — the form is the first
 * thing anyone fills in, before an account or documents exist, so there's
 * nothing "already on file" yet in that case. Section 3 only records
 * which documents the candidate can provide (checkboxes, self-reported)
 * — actually uploading them happens later, from the candidate's own
 * dashboard, once an account exists. Shared by the public /apply page,
 * the recruiter's new-lead entry point, and the narrower existing-
 * candidate on-behalf flow, since all three submit through the same
 * POST /api/applications.
 */
export default function ApplicationForm({ candidateId, onSubmitted, compact, includePersonalInfo, partnerId }: Props) {
  const [countries, setCountries] = useState<Option[]>([]);
  const [locationCountries, setLocationCountries] = useState<Option[]>([]);
  const [sectors, setSectors] = useState<Option[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/apply/options")
      .then((r) => r.json())
      .then((res) => {
        setCountries(res.countries ?? []);
        setLocationCountries(res.locationCountries ?? []);
        setSectors(res.sectors ?? []);
      })
      .catch(() => {});
  }, []);

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

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        candidate_id: candidateId,
        partner_id: partnerId,
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
              <select
                id={key}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                required={i === 0}
                className="input-field"
              >
                <option value="">{i === 0 ? "Select a country…" : "None"}</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {err(key) && <p className={errCls}>{err(key)}</p>}
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="preferred_sector_id" className={labelCls}>Preferred Type of Work <span className="text-red-500">*</span></label>
            <select
              id="preferred_sector_id"
              value={form.preferred_sector_id}
              onChange={(e) => set("preferred_sector_id", e.target.value)}
              required
              className="input-field"
            >
              <option value="">Select…</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
              <input id="nationality" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} required className="input-field" />
              {err("nationality") && <p className={errCls}>{err("nationality")}</p>}
            </div>
            <div>
              <label className={labelCls}>Second Nationality (if any)</label>
              <input value={form.second_nationality} onChange={(e) => set("second_nationality", e.target.value)} className="input-field" />
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
          {DOCUMENT_CHECKLIST.map((doc) => (
            <label key={doc.type} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.documents_available.includes(doc.type)}
                onChange={() => toggleDocument(doc.type)}
                className="w-4 h-4 mt-0.5"
              />
              <span>
                {doc.label}
                {doc.requiredFor && <span className="block text-xs text-emerald-700">Required for: {doc.requiredFor}</span>}
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
          I understand the payment plan above.
        </label>
        {err("payment_plan_acknowledged") && <p className={errCls}>{err("payment_plan_acknowledged")}</p>}
      </section>

      <section className="border-t border-slate-200 pt-5">
        <h2 className="font-bold text-slate-800 mb-4">Section 5 — Visa & Travel Readiness</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="current_location_country_id" className={labelCls}>Current Location (country) <span className="text-red-500">*</span></label>
            <select
              id="current_location_country_id"
              value={form.current_location_country_id}
              onChange={(e) => set("current_location_country_id", e.target.value)}
              required
              className="input-field"
            >
              <option value="">Select…</option>
              {locationCountries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {err("current_location_country_id") && <p className={errCls}>{err("current_location_country_id")}</p>}
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
            <label className={labelCls}>Preferred contact channel</label>
            <select
              value={form.preferred_contact_channel}
              onChange={(e) => set("preferred_contact_channel", e.target.value as typeof form.preferred_contact_channel)}
              className="input-field"
            >
              <option value="">Select…</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
            </select>
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
            I confirm the above.
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
