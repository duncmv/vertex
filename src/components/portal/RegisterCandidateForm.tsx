"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";

interface Props {
  onRegistered: () => void;
}

/** Recruiter registers a new lead who may not have an account yet (SRS FR-2.1, FR-2.8). */
export default function RegisterCandidateForm({ onRegistered }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string[] | string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    date_of_birth: "",
    passport_number: "",
    phone: "",
    email: "",
    desired_role: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.details ? Object.values(body.error.details).flat() as string[] : body.error?.message ?? "Registration failed.");
        return;
      }
      setForm({ full_name: "", nationality: "", date_of_birth: "", passport_number: "", phone: "", email: "", desired_role: "" });
      setOpen(false);
      onRegistered();
    } catch {
      setError("Registration failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6">
      <button onClick={() => setOpen((v) => !v)} className="btn-primary text-xs">
        <Plus size={16} weight="bold" /> Register Candidate
      </button>

      {open && (
        <form onSubmit={submit} className="card p-6 mt-4 space-y-4">
          <h3 className="font-semibold text-midnight-900">New candidate lead</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input-field"
            />
            <input
              required
              placeholder="Nationality"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              className="input-field"
            />
            <input
              type="date"
              placeholder="Date of birth"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Passport number"
              value={form.passport_number}
              onChange={(e) => setForm({ ...form, passport_number: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Desired role"
              value={form.desired_role}
              onChange={(e) => setForm({ ...form, desired_role: e.target.value })}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
            {saving ? "Registering…" : "Register Candidate"}
          </button>
          {error && (
            <div className="text-xs text-red-500">
              {Array.isArray(error) ? (
                <ul className="list-disc list-inside">{error.map((e) => <li key={e}>{e}</li>)}</ul>
              ) : error}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
