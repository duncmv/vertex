"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";

interface CandidateEditableDetails {
  date_of_birth: string | null;
  passport_number: string | null;
  email: string | null;
  desired_role: string | null;
}

interface Props {
  candidateId: string;
  initial: CandidateEditableDetails;
  onSaved: (data: CandidateEditableDetails) => void;
}

/** Fills in the rest of a lead's profile progressively (SRS FR-2.5, FR-2.8) — a recruiter's first contact may not have every field. */
export default function CandidateEditDetails({ candidateId, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    date_of_birth: initial.date_of_birth ? initial.date_of_birth.slice(0, 10) : "",
    passport_number: initial.passport_number ?? "",
    email: initial.email ?? "",
    desired_role: initial.desired_role ?? "",
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
