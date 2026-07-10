"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import { Handshake, Plus } from "@phosphor-icons/react";

const PARTNER_TYPE_LABELS: Record<string, string> = {
  travel_agency: "Travel Agency",
  visa_consultancy: "Visa Consultancy",
  manpower_supplier: "Manpower Supplier",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-red-100 text-red-700",
};

const MOU_STYLES: Record<string, string> = {
  none: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-emerald-100 text-emerald-800",
};

interface Partner {
  id: string;
  name: string;
  partner_type: string;
  country_of_operation: string;
  status: string;
  mou_status: string;
  contact_name: string;
  contact_email: string;
  _count: { candidates: number };
}

const emptyForm = {
  name: "",
  partner_type: "travel_agency",
  country_of_operation: "",
  business_registration_number: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

// Partner CRM (SRS FR-5.1) — travel agencies, visa consultancies, manpower
// suppliers that source candidate leads via the Agency Application Form.
// Staff-managed only: no partner self-service portal, since agency
// submissions still come in by email and get re-keyed here.
export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/partners")
      .then((r) => r.json())
      .then((res) => setPartners(res.data ?? []))
      .catch(() => setError("Failed to load partners."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create partner.");
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create partner.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="eyebrow mb-3">
            <span className="eyebrow-rule" />
            Partner CRM
          </p>
          <h1 className="section-title text-3xl md:text-4xl mb-2">Partners.</h1>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary text-xs">
          <Plus size={16} weight="bold" /> Add Partner
        </button>
      </div>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Travel agencies, visa consultancies, and manpower suppliers that source candidate leads (SRS FR-5.1).
        Agency submissions still arrive by email — add the agency here, then register the candidate against it.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-8">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-8 grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="partner-name" className="block text-xs font-medium text-midnight-900/60 mb-1.5">Agency Name</label>
            <input id="partner-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Horizon Travel & Visa Services" />
          </div>
          <div>
            <label htmlFor="partner-type" className="block text-xs font-medium text-midnight-900/60 mb-1.5">Partner Type</label>
            <select id="partner-type" value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })} className="input-field">
              {Object.entries(PARTNER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="partner-country" className="block text-xs font-medium text-midnight-900/60 mb-1.5">Country of Operation</label>
            <input id="partner-country" required value={form.country_of_operation} onChange={(e) => setForm({ ...form, country_of_operation: e.target.value })} className="input-field" placeholder="e.g. Kenya" />
          </div>
          <div>
            <label htmlFor="partner-reg-number" className="block text-xs font-medium text-midnight-900/60 mb-1.5">Business Registration No. <span className="text-midnight-900/35 font-normal">(optional)</span></label>
            <input id="partner-reg-number" value={form.business_registration_number} onChange={(e) => setForm({ ...form, business_registration_number: e.target.value })} className="input-field" />
          </div>
          <div>
            <label htmlFor="partner-contact-name" className="block text-xs font-medium text-midnight-900/60 mb-1.5">Contact Name</label>
            <input id="partner-contact-name" required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label htmlFor="partner-contact-phone" className="block text-xs font-medium text-midnight-900/60 mb-1.5">Contact Phone</label>
            <input id="partner-contact-phone" required value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="partner-contact-email" className="block text-xs font-medium text-midnight-900/60 mb-1.5">Contact Email</label>
            <input id="partner-contact-email" required type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="input-field" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs px-5">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary text-xs px-5 disabled:opacity-60">
              {creating ? "Adding…" : "Add Partner"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : partners.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No partners yet — add one above.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Agency</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Country</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">MOU</th>
                <th className="px-5 py-3 font-semibold">Candidates Sourced</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4">
                    <Link href={`/management/partners/${p.id}`} className="font-medium text-midnight-900 hover:text-gold-600 flex items-center gap-2">
                      <Handshake size={15} weight="regular" className="text-gold-600 shrink-0" />
                      {p.name}
                    </Link>
                    <div className="text-xs text-midnight-900/45 mt-0.5">{p.contact_name} · {p.contact_email}</div>
                  </td>
                  <td className="px-5 py-4 text-midnight-900/70">{PARTNER_TYPE_LABELS[p.partner_type] ?? p.partner_type}</td>
                  <td className="px-5 py-4 text-midnight-900/70">{p.country_of_operation}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${MOU_STYLES[p.mou_status] ?? "bg-slate-100 text-slate-700"}`}>
                      {p.mou_status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-midnight-900/70">{p._count.candidates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
