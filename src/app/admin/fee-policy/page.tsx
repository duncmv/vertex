"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";

interface FeePolicy {
  id: string;
  country_id: string | null;
  country: { name: string } | null;
  enabled: boolean;
  initial_amount: number | null;
  final_amount: number | null;
  currency: string;
  updated_at: string;
}

interface Country { id: string; name: string; }

export default function FeePolicyPage() {
  const [policies, setPolicies] = useState<FeePolicy[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  const [countryId, setCountryId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [currency, setCurrency] = useState("USD");

  const load = () => {
    Promise.all([
      fetch("/api/fee-policy").then((r) => r.json()),
      fetch("/api/admin/countries").then((r) => r.json()),
    ]).then(([feeRes, countryRes]) => {
      setPolicies(feeRes.data ?? []);
      setCountries(countryRes.data ?? []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const save = async () => {
    const res = await fetch("/api/fee-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country_id: countryId || null,
        enabled,
        initial_amount: initialAmount ? Number(initialAmount) : null,
        final_amount: finalAmount ? Number(finalAmount) : null,
        currency,
      }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error ?? "Failed to save."); return; }
    setCountryId(""); setEnabled(false); setInitialAmount(""); setFinalAmount(""); setCurrency("USD");
    load();
  };

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Mobility Lifecycle
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Fee policy.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        SRS FR-4.5 — milestone-payment recording defaults off. Turn it on globally or per destination country, and
        set the initial/final amounts, whenever the business is ready.
      </p>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : (
        <>
          <div className="card p-6 mb-6">
            <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Set a policy</h2>
            <div className="grid sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-midnight-900/60 mb-1">Country</label>
                <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className="input-field text-sm">
                  <option value="">Global default</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-midnight-900/60 mb-1">Initial amount</label>
                <input type="number" min="0" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-midnight-900/60 mb-1">Final amount</label>
                <input type="number" min="0" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-midnight-900/60 mb-1">Currency</label>
                <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className="input-field text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-midnight-900/70 pb-2.5">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Enabled
              </label>
            </div>
            <button onClick={save} className="btn-primary text-xs mt-4">Save Policy</button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Scope</th>
                  <th className="px-5 py-3 font-semibold">Enabled</th>
                  <th className="px-5 py-3 font-semibold">Initial</th>
                  <th className="px-5 py-3 font-semibold">Final</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-midnight-900/40">No policies set yet — milestone payments are disabled everywhere by default.</td></tr>
                )}
                {policies.map((p) => (
                  <tr key={p.id} className="border-b border-midnight-900/5 last:border-0">
                    <td className="px-5 py-4 font-medium text-midnight-900">{p.country?.name ?? "Global default"}</td>
                    <td className="px-5 py-4">{p.enabled ? <span className="badge-approved">Enabled</span> : <span className="badge-closed">Disabled</span>}</td>
                    <td className="px-5 py-4 text-midnight-900/70">{p.initial_amount ? `${p.currency} ${p.initial_amount}` : "—"}</td>
                    <td className="px-5 py-4 text-midnight-900/70">{p.final_amount ? `${p.currency} ${p.final_amount}` : "—"}</td>
                    <td className="px-5 py-4 text-midnight-900/45">{new Date(p.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PortalShell>
  );
}
