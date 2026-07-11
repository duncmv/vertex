"use client";

import { forwardRef, useImperativeHandle, useState } from "react";

interface ProfileFields {
  nationality?: string | null;
  second_nationality?: string | null;
  date_of_birth?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  current_occupation?: string | null;
  highest_education?: string | null;
  home_address?: string | null;
  whatsapp_number?: string | null;
  marital_status?: string | null;
}

interface Props {
  initial: ProfileFields;
  onSaved: () => void;
  /**
   * Hides the standalone "Save Personal Information" button — set by
   * ApplicationForm when this is embedded as its Section 2, where saving
   * is instead triggered via the imperative handle from the surrounding
   * "Submit Application" click (one action, not two). The standalone
   * /dashboard usage leaves this unset and keeps its own explicit button.
   */
  hideSaveButton?: boolean;
}

export interface CandidateProfileFormHandle {
  /** Persists the form's current values; resolves false on failure (error state is already shown inline). */
  save: () => Promise<boolean>;
}

const toDateInput = (v?: string | null) => (v ? v.slice(0, 10) : "");

/**
 * Section 2 of the Candidate Information Form ("Candidate Personal
 * Information") — self-service completion for a logged-in candidate,
 * separate from the recruiter-assisted CandidateEditDetails path since a
 * self-registered candidate has no recruiter to fill this in for them.
 */
const CandidateProfileForm = forwardRef<CandidateProfileFormHandle, Props>(function CandidateProfileForm(
  { initial, onSaved, hideSaveButton },
  ref
) {
  const [form, setForm] = useState({
    nationality: initial.nationality ?? "",
    second_nationality: initial.second_nationality ?? "",
    date_of_birth: toDateInput(initial.date_of_birth),
    passport_number: initial.passport_number ?? "",
    passport_expiry: toDateInput(initial.passport_expiry),
    current_occupation: initial.current_occupation ?? "",
    highest_education: initial.highest_education ?? "",
    home_address: initial.home_address ?? "",
    whatsapp_number: initial.whatsapp_number ?? "",
    marital_status: initial.marital_status ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/candidates/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to save profile.");
        return false;
      }
      setSaved(true);
      onSaved();
      return true;
    } catch {
      setError("Failed to save profile.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ save }));

  const labelCls = "block text-xs font-medium text-midnight-900/60 mb-1";
  const inputCls = "input-field text-sm";

  return (
    // A <div>, not a <form> — this is embedded directly inside
    // ApplicationForm's own <form> (as Section 2, between Section 1 and
    // Section 3) when reached via /apply, and HTML doesn't allow nesting
    // <form> elements.
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>Nationality</label>
        <input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Second Nationality (if any)</label>
        <input value={form.second_nationality} onChange={(e) => set("second_nationality", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Date of Birth</label>
        <input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Marital Status</label>
        <input value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Passport Number</label>
        <input value={form.passport_number} onChange={(e) => set("passport_number", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Passport Expiry Date <span className="text-midnight-900/35">(min. 6 months validity)</span></label>
        <input type="date" value={form.passport_expiry} onChange={(e) => set("passport_expiry", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Current Occupation</label>
        <input value={form.current_occupation} onChange={(e) => set("current_occupation", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Highest Education / Qualification</label>
        <input value={form.highest_education} onChange={(e) => set("highest_education", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>WhatsApp Number</label>
        <input value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Complete Home Address</label>
        <input value={form.home_address} onChange={(e) => set("home_address", e.target.value)} className={inputCls} />
      </div>

      {error && <div className="sm:col-span-2 text-xs text-red-600">{error}</div>}
      {saved && !error && <div className="sm:col-span-2 text-xs text-emerald-700">Saved.</div>}

      {hideSaveButton ? (
        <p className="sm:col-span-2 text-xs text-midnight-900/40">
          Saved automatically when you submit your application below.
        </p>
      ) : (
        <div className="sm:col-span-2">
          <button type="button" onClick={save} disabled={saving} className="btn-primary text-xs py-2.5 px-5 disabled:opacity-60">
            {saving ? "Saving…" : "Save Personal Information"}
          </button>
        </div>
      )}
    </div>
  );
});

export default CandidateProfileForm;
