"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DocumentLink from "@/components/DocumentLink";
import CandidateStatusControls from "./CandidateStatusControls";
import CandidateDocumentUpload from "./CandidateDocumentUpload";
import { PencilSimple, CheckCircle } from "@phosphor-icons/react";

const STATUS_STYLES: Record<string, string> = {
  identified: "bg-slate-100 text-slate-700",
  screened: "bg-blue-100 text-blue-700",
  guided_to_apply: "bg-purple-100 text-purple-700",
  submitted: "bg-yellow-100 text-yellow-800",
  reported: "bg-orange-100 text-orange-700",
  verified: "bg-teal-100 text-teal-700",
  approved: "bg-emerald-100 text-emerald-800",
};

interface ApplicationRow {
  id: string;
  application_status: string;
  submitted_at: string;
  preferred_country_1: { id: string; name: string } | null;
  preferred_country_2: { id: string; name: string } | null;
  preferred_country_3: { id: string; name: string } | null;
  preferred_sector: { id: string; name: string } | null;
  earliest_travel_date: string | null;
  prior_eu_visa_applied: string | null;
  documents_available: string[];
  current_location_country: { id: string; name: string } | null;
  holds_schengen_visa: string | null;
  prior_visa_refusals: string | null;
  available_for_embassy_appointment: boolean;
  willing_to_start_within_30_days: boolean;
  preferred_contact_channel: string | null;
  payment_plan_acknowledged: boolean;
}

interface CandidateData {
  id: string;
  source: string;
  lifecycle_status: string;
  nationality: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  desired_role: string | null;
  consent_given: boolean;
  consent_at: string | null;
  return_reason: string | null;
  screening_result: boolean | null;
  screening_evaluated_at: string | null;
  created_at: string;
  second_nationality: string | null;
  passport_expiry: string | null;
  current_occupation: string | null;
  highest_education: string | null;
  home_address: string | null;
  whatsapp_number: string | null;
  marital_status: string | null;
  user: { full_name: string; email: string; phone: string | null } | null;
  recruiter: { id: string; full_name: string } | null;
  country: { id: string; name: string } | null;
  documents: { id: string; type: string; verification_status: string; uploaded_at: string }[];
  applications: ApplicationRow[];
}

const EDITABLE_FIELDS = [
  "date_of_birth", "passport_number", "email", "desired_role", "second_nationality",
  "passport_expiry", "current_occupation", "highest_education", "home_address",
  "whatsapp_number", "marital_status",
] as const;

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] text-midnight-900/40 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-midnight-900">{value || value === 0 ? value : "—"}</div>
    </div>
  );
}

interface Props {
  candidateId: string;
  backHref: string;
  canVerify?: boolean;
  canApprove?: boolean;
}

/**
 * Full Candidate Information Form submission — personal details (Section 2)
 * plus the most recent Application's Section 1/3/4/5 answers — with
 * lifecycle/edit/upload actions, replacing the old inline-dropdown editing
 * pattern in CandidateList. Shared across staff portals the same way
 * CaseDetail is; canVerify/canApprove gate which lifecycle actions render.
 */
export default function CandidateDetail({ candidateId, backHref, canVerify = false, canApprove = false }: Props) {
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<(typeof EDITABLE_FIELDS)[number], string>>({
    date_of_birth: "", passport_number: "", email: "", desired_role: "", second_nationality: "",
    passport_expiry: "", current_occupation: "", highest_education: "", home_address: "",
    whatsapp_number: "", marital_status: "",
  });

  const load = () => {
    setLoading(true);
    fetch(`/api/candidates/${candidateId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error.message);
        setData(res.data);
        setForm({
          date_of_birth: res.data.date_of_birth?.slice(0, 10) ?? "",
          passport_number: res.data.passport_number ?? "",
          email: res.data.email ?? "",
          desired_role: res.data.desired_role ?? "",
          second_nationality: res.data.second_nationality ?? "",
          passport_expiry: res.data.passport_expiry?.slice(0, 10) ?? "",
          current_occupation: res.data.current_occupation ?? "",
          highest_education: res.data.highest_education ?? "",
          home_address: res.data.home_address ?? "",
          whatsapp_number: res.data.whatsapp_number ?? "",
          marital_status: res.data.marital_status ?? "",
        });
      })
      .catch(() => setError("Failed to load candidate."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [candidateId]);

  const recordConsent = async () => {
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent_given: true }),
    });
    if (res.ok) load();
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-midnight-900/50">Loading…</p>;
  if (error || !data) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>;

  const name = data.user?.full_name ?? data.full_name ?? "— unnamed lead —";
  const contact = data.user?.email ?? data.email ?? data.phone ?? "";
  const app = data.applications[0] as ApplicationRow | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={backHref} className="text-xs text-midnight-900/45 hover:text-gold-600 mb-2 inline-block">← Back to candidates</Link>
          <h1 className="text-2xl font-semibold text-midnight-900">{name}</h1>
          <p className="text-sm text-midnight-900/50">{contact}</p>
        </div>
        <div className="text-right space-y-1.5">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[data.lifecycle_status] ?? "bg-slate-100 text-slate-700"}`}>
            {data.lifecycle_status.replace(/_/g, " ")}
          </span>
          {data.screening_result !== null && (
            <div className={`text-xs font-medium ${data.screening_result ? "text-emerald-600" : "text-red-500"}`}>
              Screening: {data.screening_result ? "Passed" : "Failed"}
            </div>
          )}
        </div>
      </div>

      {data.return_reason && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <span className="font-semibold">Returned:</span> {data.return_reason}
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider">Lifecycle status</h2>
          {!data.consent_given && (
            <button type="button" onClick={recordConsent} className="text-xs font-semibold text-red-500 hover:underline">
              No consent on file — record it
            </button>
          )}
        </div>
        <CandidateStatusControls
          candidateId={data.id}
          status={data.lifecycle_status as never}
          canVerify={canVerify}
          canApprove={canApprove}
          onChanged={load}
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider">Personal Information (Section 2)</h2>
          <button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 text-xs text-gold-600 hover:underline">
            <PencilSimple size={12} weight="bold" /> {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={saveDetails} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Date of birth</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Passport number</label>
              <input value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Desired role</label>
              <input value={form.desired_role} onChange={(e) => setForm({ ...form, desired_role: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Second nationality</label>
              <input value={form.second_nationality} onChange={(e) => setForm({ ...form, second_nationality: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Passport expiry</label>
              <input type="date" value={form.passport_expiry} onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Current occupation</label>
              <input value={form.current_occupation} onChange={(e) => setForm({ ...form, current_occupation: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Highest education</label>
              <input value={form.highest_education} onChange={(e) => setForm({ ...form, highest_education: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-midnight-900/50 mb-1">Complete home address</label>
              <input value={form.home_address} onChange={(e) => setForm({ ...form, home_address: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">WhatsApp number</label>
              <input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-midnight-900/50 mb-1">Marital status</label>
              <input value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Nationality" value={data.nationality} />
            <Field label="Second nationality" value={data.second_nationality} />
            <Field label="Date of birth" value={data.date_of_birth?.slice(0, 10)} />
            <Field label="Passport number" value={data.passport_number} />
            <Field label="Passport expiry" value={data.passport_expiry?.slice(0, 10)} />
            <Field label="Phone" value={data.user?.phone ?? data.phone} />
            <Field label="Email" value={data.user?.email ?? data.email} />
            <Field label="WhatsApp" value={data.whatsapp_number} />
            <Field label="Desired role" value={data.desired_role} />
            <Field label="Current occupation" value={data.current_occupation} />
            <Field label="Highest education" value={data.highest_education} />
            <Field label="Marital status" value={data.marital_status} />
            <div className="sm:col-span-3">
              <Field label="Home address" value={data.home_address} />
            </div>
          </div>
        )}
      </div>

      {app && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">
            Candidate Information Form Submission
          </h2>
          <p className="text-xs text-midnight-900/40 mb-4">Submitted {new Date(app.submitted_at).toLocaleDateString()}</p>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Field label="Preferred country — option 1" value={app.preferred_country_1?.name} />
            <Field label="Preferred country — option 2" value={app.preferred_country_2?.name} />
            <Field label="Preferred country — option 3" value={app.preferred_country_3?.name} />
            <Field label="Preferred type of work" value={app.preferred_sector?.name} />
            <Field label="Earliest travel date" value={app.earliest_travel_date?.slice(0, 10)} />
            <Field label="Prior EU visa applied" value={app.prior_eu_visa_applied} />
          </div>

          <div className="mb-6">
            <div className="text-[11px] text-midnight-900/40 uppercase tracking-wider mb-1.5">Documents self-reported as available</div>
            {app.documents_available.length === 0 ? (
              <p className="text-sm text-midnight-900/40">None reported.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {app.documents_available.map((d) => (
                  <span key={d} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-ivory-100 border border-midnight-900/10 text-midnight-900/70 capitalize">
                    {d.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Field label="Current location" value={app.current_location_country?.name} />
            <Field label="Holds Schengen/EU visa" value={app.holds_schengen_visa} />
            <Field label="Prior visa refusals" value={app.prior_visa_refusals} />
            <Field label="Available for embassy appointment" value={app.available_for_embassy_appointment ? "Yes" : "No"} />
            <Field label="Willing to start within 30 days" value={app.willing_to_start_within_30_days ? "Yes" : "No"} />
            <Field label="Preferred contact channel" value={app.preferred_contact_channel} />
          </div>

          <div className="flex items-center gap-2 text-sm">
            {app.payment_plan_acknowledged ? (
              <CheckCircle size={16} weight="fill" className="text-emerald-600" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-midnight-900/20 inline-block" />
            )}
            Payment plan acknowledged
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Documents</h2>
        <div className="space-y-2 mb-4">
          {data.documents.length === 0 && <p className="text-sm text-midnight-900/40">No documents uploaded yet.</p>}
          {data.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm border-b border-midnight-900/5 pb-2">
              <DocumentLink documentId={d.id} label={d.type} className="text-gold-600 hover:underline capitalize" />
              <span className="text-xs text-midnight-900/45 capitalize">{d.verification_status}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 pt-2 border-t border-midnight-900/10">
          <CandidateDocumentUpload candidateId={data.id} type="cv" onUploaded={load} />
          <CandidateDocumentUpload candidateId={data.id} type="passport" onUploaded={load} />
        </div>
      </div>
    </div>
  );
}
