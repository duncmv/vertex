"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";

interface CandidateEditableDetails {
  date_of_birth: string | null;
  passport_number: string | null;
  email: string | null;
  desired_role: string | null;
  second_nationality?: string | null;
  passport_expiry?: string | null;
  current_occupation?: string | null;
  highest_education?: string | null;
  home_address?: string | null;
  whatsapp_number?: string | null;
  marital_status?: string | null;
}

interface Props {
  candidateId: string;
  initial: CandidateEditableDetails;
  onSaved: (data: CandidateEditableDetails) => void;
}

/**
 * Fills in the rest of a lead's profile progressively (SRS FR-2.5, FR-2.8) —
 * a recruiter's first contact may not have every field. Covers Section 2 of
 * the Candidate Information Form for a lead with no account of their own to
 * complete it from their own dashboard.
 */
export default function CandidateEditDetails({ candidateId, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    date_of_birth: initial.date_of_birth ? initial.date_of_birth.slice(0, 10) : "",
    passport_number: initial.passport_number ?? "",
    email: initial.email ?? "",
    desired_role: initial.desired_role ?? "",
    second_nationality: initial.second_nationality ?? "",
    passport_expiry: initial.passport_expiry ? initial.passport_expiry.slice(0, 10) : "",
    current_occupation: initial.current_occupation ?? "",
    highest_education: initial.highest_education ?? "",
    home_address: initial.home_address ?? "",
    whatsapp_number: initial.whatsapp_number ?? "",
    marital_status: initial.marital_status ?? "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Update failed.");
        return;
      }
      onSaved(body.data);
      setOpen(false);
    } catch {
      setError("Update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-midnight-900/40 hover:text-gold-600">
        <PencilSimple size={11} weight="bold" /> Edit details
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-ivory-100 border border-midnight-900/10 rounded-lg p-3 space-y-2 max-w-xs">
      <input
        type="date"
        value={form.date_of_birth}
        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="Passport number"
        value={form.passport_number}
        onChange={(e) => setForm({ ...form, passport_number: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="Desired role"
        value={form.desired_role}
        onChange={(e) => setForm({ ...form, desired_role: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="Second nationality (if any)"
        value={form.second_nationality}
        onChange={(e) => setForm({ ...form, second_nationality: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <label className="block text-[10px] text-midnight-900/40 -mb-1">Passport expiry (min. 6 months validity)</label>
      <input
        type="date"
        value={form.passport_expiry}
        onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="Current occupation"
        value={form.current_occupation}
        onChange={(e) => setForm({ ...form, current_occupation: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="Highest education / qualification"
        value={form.highest_education}
        onChange={(e) => setForm({ ...form, highest_education: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="Complete home address"
        value={form.home_address}
        onChange={(e) => setForm({ ...form, home_address: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="WhatsApp number"
        value={form.whatsapp_number}
        onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <input
        placeholder="Marital status"
        value={form.marital_status}
        onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
        className="input-field py-1.5 text-xs w-full"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary py-1.5 px-3 text-xs">
          Cancel
        </button>
      </div>
      {error && <div className="text-[10px] text-red-500">{error}</div>}
    </form>
  );
}
