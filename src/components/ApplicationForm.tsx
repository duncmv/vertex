"use client";

import { useEffect, useState } from "react";

interface Option {
  id: string;
  name: string;
}

interface Props {
  /** Present when a recruiter/supervisor is submitting on a candidate's behalf (SRS FR-2.1). */
  candidateId?: string;
  onSubmitted: () => void;
  /** Renders a compact layout for embedding inside a portal panel rather than the full public page. */
  compact?: boolean;
}

const emptyForm = {
  preferred_country_1_id: "",
  preferred_country_2_id: "",
  preferred_country_3_id: "",
  preferred_sector_id: "",
  earliest_travel_date: "",
  prior_eu_visa_applied: "",
  current_location_country: "",
  holds_schengen_visa: "",
  prior_visa_refusals: "",
  available_for_embassy_appointment: false,
  willing_to_start_within_30_days: false,
  preferred_contact_channel: "" as "" | "email" | "whatsapp" | "phone",
  payment_plan_acknowledged: false,
  cover_letter: "",
};

/**
 * Sections 1, 4 & 5 of the Candidate Information Form (Programme Selection,
 * Payment Plan Acknowledgement, Visa & Travel Readiness) — the fields that
 * make up an Application record. Shared by the public /apply page (a
 * candidate applying for themselves) and the recruiter-assisted on-behalf
 * flow, since both submit through the same POST /api/applications.
 */
export default function ApplicationForm({ candidateId, onSubmitted, compact }: Props) {
  const [countries, setCountries] = useState<Option[]>([]);
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
        setSectors(res.sectors ?? []);
      })
      .catch(() => {});
  }, []);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        preferred_country_2_id: form.preferred_country_2_id || undefined,
        preferred_country_3_id: form.preferred_country_3_id || undefined,
        preferred_contact_channel: form.preferred_contact_channel || undefined,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus("success");
      setMessage("Application submitted successfully. We'll review it and confirm your programme within 48 hours.");
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
        <h2 className="font-bold text-green-800 text-lg mb-1">Application Submitted!</h2>
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

      <section className="border-t border-slate-200 pt-5">
        <h2 className="font-bold text-slate-800 mb-4">Section 5 — Visa & Travel Readiness</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Current Location (country)</label>
            <input
              value={form.current_location_country}
              onChange={(e) => set("current_location_country", e.target.value)}
              className="input-field"
            />
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

      {message && status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{message}</div>
      )}

      <button type="submit" disabled={status === "loading"} className="btn-gold w-full text-base py-3.5 disabled:opacity-60">
        {status === "loading" ? "Submitting…" : "Submit Application"}
      </button>
    </form>
  );
}
