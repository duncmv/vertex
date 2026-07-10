"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import { CheckCircle, Copy } from "@phosphor-icons/react";

const PARTNER_TYPE_LABELS: Record<string, string> = {
  travel_agency: "Travel Agency",
  visa_consultancy: "Visa Consultancy",
  manpower_supplier: "Manpower Supplier",
  other: "Other",
};

const STATUS_OPTIONS = ["pending", "active", "suspended"] as const;
const MOU_OPTIONS = ["none", "sent", "signed"] as const;

interface SourcedCandidateRow {
  id: string;
  full_name: string | null;
  lifecycle_status: string;
  created_at: string;
  user: { full_name: string; email: string } | null;
  recruiter: { id: string; full_name: string } | null;
}

interface PartnerDetail {
  id: string;
  name: string;
  partner_type: string;
  country_of_operation: string;
  business_registration_number: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  mou_status: string;
  mou_signed_at: string | null;
  notes: string | null;
  user_id: string | null;
  candidates: SourcedCandidateRow[];
}

// Partner detail (SRS FR-5.1): status/MOU controls and the candidates
// this partner has been bridged into Vertex's own pipeline for (empty
// until the future job-assignment/bridging step ships — the partner
// submits and manages its own candidates from its own portal).
export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/partners/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error.message);
        setPartner(res.data);
      })
      .catch(() => setError("Failed to load partner."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const updateField = async (data: Record<string, string>) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to update partner.");
      setPartner((prev) => (prev ? { ...prev, ...body.data } : body.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update partner.");
    } finally {
      setSaving(false);
    }
  };

  const provisionAccount = async () => {
    setProvisioning(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partners/${id}/provision-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create partner login.");
      setCredentials({ email: body.data.contact_email ?? partner!.contact_email, temporaryPassword: body.temporaryPassword });
      setPartner((prev) => (prev ? { ...prev, user_id: body.data.user_id } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create partner login.");
    } finally {
      setProvisioning(false);
    }
  };

  const copyTempPassword = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(credentials.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
        <p className="text-midnight-900/50">Loading…</p>
      </PortalShell>
    );
  }

  if (!partner) {
    return (
      <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error || "Partner not found."}</div>
      </PortalShell>
    );
  }

  return (
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="eyebrow mb-3">
            <span className="eyebrow-rule" />
            {PARTNER_TYPE_LABELS[partner.partner_type] ?? partner.partner_type}
          </p>
          <h1 className="section-title text-3xl md:text-4xl mb-2">{partner.name}</h1>
        </div>
        <Link href="/management/partners" className="text-sm font-medium text-midnight-900/50 hover:text-gold-600">
          ← Back to Partners
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>}

      {credentials && (
        <div className="card p-6 mb-6 border-l-4 border-gold-400">
          <div className="flex items-start gap-3">
            <CheckCircle size={22} weight="fill" className="text-gold-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-midnight-900 mb-1">Partner login created</h3>
              <p className="text-sm text-midnight-900/60 mb-3">
                Share this temporary password with <span className="font-medium">{credentials.email}</span> now —
                it will not be shown again.
              </p>
              <div className="flex items-center gap-3">
                <code className="bg-ivory-100 border border-midnight-900/10 rounded-lg px-4 py-2 text-sm font-mono text-midnight-900">
                  {credentials.temporaryPassword}
                </code>
                <button onClick={copyTempPassword} className="btn-secondary py-2 px-4 text-xs">
                  <Copy size={14} weight="bold" /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6 mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-midnight-900/50 uppercase tracking-wider mb-1">Partner Login</h2>
          <p className="text-sm text-midnight-900/60">
            {partner.user_id ? "This partner can log in and submit candidates through its own portal." : "No login yet — this partner can't submit candidates until one is created."}
          </p>
        </div>
        {!partner.user_id && (
          <button onClick={provisionAccount} disabled={provisioning} className="btn-primary text-xs disabled:opacity-60">
            {provisioning ? "Creating…" : "Create Partner Login"}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="text-xs font-semibold text-midnight-900/50 uppercase tracking-wider mb-4">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-midnight-900/50">Country</dt><dd className="text-midnight-900">{partner.country_of_operation}</dd></div>
            <div className="flex justify-between"><dt className="text-midnight-900/50">Contact</dt><dd className="text-midnight-900">{partner.contact_name}</dd></div>
            <div className="flex justify-between"><dt className="text-midnight-900/50">Email</dt><dd className="text-midnight-900">{partner.contact_email}</dd></div>
            <div className="flex justify-between"><dt className="text-midnight-900/50">Phone</dt><dd className="text-midnight-900">{partner.contact_phone}</dd></div>
            {partner.business_registration_number && (
              <div className="flex justify-between"><dt className="text-midnight-900/50">Reg. No.</dt><dd className="text-midnight-900">{partner.business_registration_number}</dd></div>
            )}
          </dl>
        </div>

        <div className="card p-6">
          <label htmlFor="partner-status" className="block text-xs font-semibold text-midnight-900/50 uppercase tracking-wider mb-4">Status</label>
          <select
            id="partner-status"
            value={partner.status}
            disabled={saving}
            onChange={(e) => updateField({ status: e.target.value })}
            className="input-field mb-2"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <p className="text-xs text-midnight-900/45">Suspend a partner to stop attributing new leads to it.</p>
        </div>

        <div className="card p-6">
          <label htmlFor="partner-mou-status" className="block text-xs font-semibold text-midnight-900/50 uppercase tracking-wider mb-4">MOU / Agreement</label>
          <select
            id="partner-mou-status"
            value={partner.mou_status}
            disabled={saving}
            onChange={(e) => updateField({ mou_status: e.target.value })}
            className="input-field mb-2"
          >
            {MOU_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {partner.mou_signed_at && (
            <p className="text-xs text-emerald-700">Signed {new Date(partner.mou_signed_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-midnight-900/50 uppercase tracking-wider mb-3">Candidates sourced</h2>

      {partner.candidates.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No candidates sourced via this partner yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-5 py-3 font-semibold">Recruiter</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Sourced</th>
              </tr>
            </thead>
            <tbody>
              {partner.candidates.map((c) => (
                <tr key={c.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4 font-medium text-midnight-900">{c.user?.full_name ?? c.full_name ?? "— unnamed lead —"}</td>
                  <td className="px-5 py-4 text-midnight-900/70">{c.recruiter?.full_name ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {c.lifecycle_status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-midnight-900/60">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
