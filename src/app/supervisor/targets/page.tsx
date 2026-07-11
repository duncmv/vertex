"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { SUPERVISOR_NAV_ITEMS } from "@/components/portal/supervisorNav";
import { Target } from "@phosphor-icons/react";

const METRIC_LABELS: Record<string, string> = {
  agent_signups: "Agent Sign-ups",
  applicant_flow: "Applicant Flow",
  conversion_rate: "Conversion Rate (%)",
};

interface CampaignTargetRow {
  id: string;
  metric: string;
  target_value: number;
  campaign: { id: string; name: string; start_date: string; end_date: string };
}

interface Recruiter {
  id: string;
  full_name: string;
}

interface Allocation {
  id: string;
  campaign_target_id: string;
  recruiter_id: string;
  target_value: number;
}

export default function SupervisorTargetsPage() {
  const [campaignTargets, setCampaignTargets] = useState<CampaignTargetRow[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/supervisor/team-targets")
      .then((r) => r.json())
      .then((res) => {
        setCampaignTargets(res.data.campaignTargets ?? []);
        setRecruiters(res.data.recruiters ?? []);
        setAllocations(res.data.allocations ?? []);
      })
      .catch(() => setError("Failed to load targets."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const key = (campaignTargetId: string, recruiterId: string) => `${campaignTargetId}:${recruiterId}`;

  const valueFor = (campaignTargetId: string, recruiterId: string) => {
    const k = key(campaignTargetId, recruiterId);
    if (drafts[k] !== undefined) return drafts[k];
    const existing = allocations.find((a) => a.campaign_target_id === campaignTargetId && a.recruiter_id === recruiterId);
    return existing ? String(existing.target_value) : "";
  };

  const allocatedTotal = (campaignTargetId: string) =>
    allocations
      .filter((a) => a.campaign_target_id === campaignTargetId)
      .reduce((sum, a) => sum + a.target_value, 0);

  const saveAllocation = async (campaignTargetId: string, recruiterId: string) => {
    const k = key(campaignTargetId, recruiterId);
    const raw = drafts[k];
    const value = Number(raw);
    if (!raw || !(value > 0)) return;

    setSavingKey(k);
    setError("");
    try {
      const res = await fetch("/api/recruiter-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_target_id: campaignTargetId, recruiter_id: recruiterId, target_value: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to save target.");
      setAllocations((prev) => {
        const existing = prev.find((a) => a.campaign_target_id === campaignTargetId && a.recruiter_id === recruiterId);
        if (existing) return prev.map((a) => (a.id === existing.id ? body.data : a));
        return [...prev, body.data];
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save target.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <PortalShell roleLabel="Country Supervisor" navItems={SUPERVISOR_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Team targets.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Allocate your country&rsquo;s active campaign targets across your own recruiters — each recruiter&rsquo;s
        weekly and monthly reports track their actual progress against whatever you set here.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>}

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : campaignTargets.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">
          No active campaign targets for your country yet — Management sets these under Campaigns.
        </div>
      ) : recruiters.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No recruiters assigned to you yet.</div>
      ) : (
        <div className="space-y-6">
          {campaignTargets.map((ct) => (
            <div key={ct.id} className="card p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-midnight-900 flex items-center gap-2">
                  <Target size={16} weight="bold" className="text-gold-600" />
                  {METRIC_LABELS[ct.metric] ?? ct.metric}
                </h2>
                <span className="text-xs text-midnight-900/45">{ct.campaign.name}</span>
              </div>
              <p className="text-xs text-midnight-900/45 mb-4">
                Country target: {ct.target_value}
                {ct.metric === "conversion_rate" ? "%" : ""} · Allocated so far: {allocatedTotal(ct.id)}
                {ct.metric === "conversion_rate" ? "%" : ""}
              </p>
              <div className="space-y-2">
                {recruiters.map((r) => {
                  const k = key(ct.id, r.id);
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="text-sm text-midnight-900/80 flex-1">{r.full_name}</span>
                      <input
                        type="number"
                        min="0"
                        value={valueFor(ct.id, r.id)}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [k]: e.target.value }))}
                        className="input-field py-1.5 text-xs w-28"
                        placeholder="Target"
                      />
                      {drafts[k] !== undefined && (
                        <button
                          type="button"
                          onClick={() => saveAllocation(ct.id, r.id)}
                          disabled={savingKey === k}
                          className="btn-primary py-1.5 px-3 text-xs disabled:opacity-60"
                        >
                          {savingKey === k ? "Saving…" : "Save"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
