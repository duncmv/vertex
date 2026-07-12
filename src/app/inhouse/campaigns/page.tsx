"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { INHOUSE_NAV_ITEMS } from "@/components/portal/inhouseNav";
import SearchableSelect from "@/components/SearchableSelect";
import { Target, Plus, X } from "@phosphor-icons/react";

const METRICS = [
  { value: "agent_signups", label: "Agent Sign-ups" },
  { value: "applicant_flow", label: "Applicant Flow" },
  { value: "conversion_rate", label: "Conversion Rate (%)" },
];

interface CampaignTargetRow {
  id: string;
  metric: string;
  target_value: number;
}

interface Campaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  targets: CampaignTargetRow[];
}

export default function InhouseCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { metric: string; value: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/inhouse/campaigns")
      .then((r) => r.json())
      .then((res) => setCampaigns(res.data?.campaigns ?? []))
      .catch(() => setError("Failed to load campaigns."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addTarget = async (campaignId: string) => {
    const draft = drafts[campaignId];
    if (!draft?.metric || !draft?.value) return;
    setSavingId(campaignId);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: draft.metric, target_value: Number(draft.value) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to save target.");
      setDrafts((prev) => ({ ...prev, [campaignId]: { metric: "agent_signups", value: "" } }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save target.");
    } finally {
      setSavingId(null);
    }
  };

  const removeTarget = async (campaignId: string, targetId: string) => {
    await fetch(`/api/campaigns/${campaignId}/targets/${targetId}`, { method: "DELETE" });
    load();
  };

  return (
    <PortalShell roleLabel="In-House Supervisor" navItems={INHOUSE_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Operations
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Campaign targets.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Set or adjust your country&rsquo;s target for each active campaign. Campaigns themselves — criteria and
        timelines — are set by Management; this is your country&rsquo;s own slice of them.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>}

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No active campaigns right now.</div>
      ) : (
        <div className="space-y-5">
          {campaigns.map((c) => (
            <div key={c.id} className="card p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-midnight-900">{c.name}</h2>
                <span className="text-xs text-midnight-900/45">
                  {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                </span>
              </div>

              <div className="border-t border-midnight-900/10 mt-4 pt-4">
                <div className="text-xs font-semibold text-midnight-900/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Target size={13} weight="bold" /> Your country&rsquo;s targets
                </div>
                {c.targets.length === 0 ? (
                  <p className="text-xs text-midnight-900/40 mb-3">No targets set for your country yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {c.targets.map((t) => (
                      <span key={t.id} className="inline-flex items-center gap-2 bg-ivory-100 border border-midnight-900/10 rounded-full px-3 py-1.5 text-xs">
                        <span className="font-medium">{METRICS.find((m) => m.value === t.metric)?.label ?? t.metric}</span>
                        <span className="text-midnight-900/50">
                          {t.target_value}
                          {t.metric === "conversion_rate" ? "%" : ""}
                        </span>
                        <button onClick={() => removeTarget(c.id, t.id)} aria-label="Remove target">
                          <X size={12} weight="bold" className="text-midnight-900/30 hover:text-red-500" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <SearchableSelect
                    value={drafts[c.id]?.metric ?? "agent_signups"}
                    onChange={(value) => setDrafts((prev) => ({ ...prev, [c.id]: { metric: value, value: prev[c.id]?.value ?? "" } }))}
                    className="input-field py-1.5 text-xs w-auto"
                    options={METRICS}
                  />
                  <input
                    type="number"
                    placeholder="Target value"
                    value={drafts[c.id]?.value ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: { metric: prev[c.id]?.metric ?? "agent_signups", value: e.target.value } }))}
                    className="input-field py-1.5 text-xs w-32"
                  />
                  <button
                    onClick={() => addTarget(c.id)}
                    disabled={savingId === c.id}
                    className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-60"
                  >
                    <Plus size={12} weight="bold" /> {savingId === c.id ? "Saving…" : "Set Target"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
