"use client";

import { useEffect, useState, useCallback } from "react";
import DocumentLink from "@/components/DocumentLink";
import DocumentVerifyControls from "@/components/DocumentVerifyControls";
import SearchableSelect from "@/components/SearchableSelect";
import CaseStageProgress from "./CaseStageProgress";
import { CASE_STAGE_ORDER, CASE_STAGE_LABELS, type CaseStageKey } from "./caseStages";
import { CASE_UPLOAD_EXCLUDED_KEYS } from "@/lib/documentTypes";

interface Document {
  id: string;
  type: string;
  verification_status: string;
  uploaded_at: string;
}

interface StageEvent {
  id: string;
  stage: CaseStageKey;
  entered_at: string;
  completed_at: string | null;
  notes: string | null;
  owner: { full_name: string } | null;
}

interface Contract {
  id: string;
  status: string;
  content: string;
  signed_by_name: string | null;
  signed_at: string | null;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  currency: string;
  receipt_reference: string | null;
  recorded_at: string;
  recorder: { full_name: string };
}

interface CaseData {
  id: string;
  current_stage: CaseStageKey;
  stage_deadline: string | null;
  stage_events: StageEvent[];
  contract: Contract | null;
  payments: Payment[];
  retention_follow_up: { due_at: string; completed_at: string | null; notes: string | null } | null;
  application: {
    candidate: {
      id: string;
      full_name: string | null;
      country_id: string | null;
      user: { full_name: string; email: string } | null;
      recruiter: { full_name: string } | null;
      documents: Document[];
    };
    job: { title: string; country: string; city: string } | null;
    preferred_country_1: { name: string } | null;
    preferred_sector: { name: string } | null;
  };
}

export default function CaseDetail({ caseId }: { caseId: string }) {
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feeEnabled, setFeeEnabled] = useState(false);

  const [nextStage, setNextStage] = useState("");
  const [stageNotes, setStageNotes] = useState("");
  const [stageDeadline, setStageDeadline] = useState("");

  const [contractContent, setContractContent] = useState("");
  const [signName, setSignName] = useState("");

  const [payType, setPayType] = useState<"documentation" | "permit" | "visa">("documentation");
  const [payAmount, setPayAmount] = useState("");
  const [payReceipt, setPayReceipt] = useState("");

  const [docTypes, setDocTypes] = useState<{ key: string; label: string }[]>([]);
  const [uploadType, setUploadType] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Beyond the screening-gate's cv/passport (handled separately, earlier
  // in the pipeline): the general mobility-lifecycle set plus the
  // Candidate Information Form's Section 3 per-programme extras — which
  // extras actually apply is configured per country under Admin → Sectors
  // & Requirements, and any new type admin adds there shows up here too.
  useEffect(() => {
    fetch("/api/admin/document-types")
      .then((r) => r.json())
      .then((res) => {
        const types = (res.data ?? []).filter((t: { key: string }) => !(CASE_UPLOAD_EXCLUDED_KEYS as readonly string[]).includes(t.key));
        setDocTypes(types);
        setUploadType((prev) => prev || types[0]?.key || "");
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}`);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to load case."); setLoading(false); return; }
    setData(json.data);
    setLoading(false);

    const countryId = json.data.application.candidate.country_id;
    const feeRes = await fetch("/api/fee-policy");
    const feeJson = await feeRes.json();
    const policies: { country_id: string | null; enabled: boolean }[] = feeJson.data ?? [];
    const countryPolicy = policies.find((p) => p.country_id === countryId);
    const globalPolicy = policies.find((p) => p.country_id === null);
    setFeeEnabled((countryPolicy ?? globalPolicy)?.enabled ?? false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-midnight-900/50">Loading…</p>;
  if (error || !data) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>;

  const candidateName = data.application.candidate.user?.full_name ?? data.application.candidate.full_name ?? "— unnamed —";

  const advanceStage = async () => {
    if (!nextStage) return;
    const res = await fetch(`/api/cases/${caseId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage, notes: stageNotes || undefined, stage_deadline: stageDeadline || undefined }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error ?? "Failed to update stage."); return; }
    setNextStage(""); setStageNotes(""); setStageDeadline("");
    load();
  };

  const generateContract = async () => {
    if (!contractContent.trim()) return;
    const res = await fetch(`/api/cases/${caseId}/contract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: contractContent }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error ?? "Failed to generate contract."); return; }
    setContractContent("");
    load();
  };

  const recordPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    const res = await fetch(`/api/cases/${caseId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: payType, amount, receipt_reference: payReceipt || undefined }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error ?? "Failed to record payment."); return; }
    setPayAmount(""); setPayReceipt("");
    load();
  };

  const completeRetention = async () => {
    const res = await fetch(`/api/cases/${caseId}/retention`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error ?? "Failed to complete follow-up."); return; }
    load();
  };

  const uploadDocument = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append("file", uploadFile);
    const res = await fetch(`/api/upload?type=${uploadType}&candidate_id=${data.application.candidate.id}`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error ?? "Upload failed."); return; }
    setUploadFile(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-midnight-900">{candidateName}</h2>
            <p className="text-sm text-midnight-900/50">
              {data.application.job
                ? <>{data.application.job.title} · {data.application.job.city}, {data.application.job.country}</>
                : <>{data.application.preferred_sector?.name ?? "General Programme"}{data.application.preferred_country_1 && <> · {data.application.preferred_country_1.name}</>}</>}
              {data.application.candidate.recruiter && <> · {data.application.candidate.recruiter.full_name}</>}
            </p>
          </div>
        </div>
        <CaseStageProgress stage={data.current_stage} />

        <div className="mt-6 pt-6 border-t border-midnight-900/10 grid sm:grid-cols-3 gap-3">
          <SearchableSelect
            value={nextStage}
            onChange={setNextStage}
            placeholder="Set stage…"
            options={CASE_STAGE_ORDER.filter((s) => s !== data.current_stage).map((s) => ({ value: s, label: CASE_STAGE_LABELS[s] }))}
          />
          <input type="date" value={stageDeadline} onChange={(e) => setStageDeadline(e.target.value)} className="input-field text-sm" placeholder="Deadline (optional)" />
          <input value={stageNotes} onChange={(e) => setStageNotes(e.target.value)} className="input-field text-sm" placeholder="Notes (optional)" />
        </div>
        <button onClick={advanceStage} disabled={!nextStage} className="btn-primary mt-3 text-xs disabled:opacity-40">Update Stage</button>

        <div className="mt-6 pt-6 border-t border-midnight-900/10 space-y-2">
          <h3 className="text-xs font-semibold text-midnight-900/50 uppercase tracking-wider mb-2">Stage History</h3>
          {data.stage_events.map((e) => (
            <div key={e.id} className="flex items-start gap-3 text-sm">
              <div className="w-32 shrink-0 text-midnight-900/70 font-medium">{CASE_STAGE_LABELS[e.stage]}</div>
              <div className="flex-1 text-midnight-900/45">
                {new Date(e.entered_at).toLocaleDateString()}
                {e.completed_at && <> → {new Date(e.completed_at).toLocaleDateString()}</>}
                {e.owner && <> · {e.owner.full_name}</>}
                {e.notes && <div className="text-midnight-900/60 mt-0.5">{e.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Documents (SRS FR-4.6)</h3>
        <div className="space-y-2 mb-4">
          {data.application.candidate.documents.length === 0 && <p className="text-sm text-midnight-900/40">No documents uploaded yet.</p>}
          {data.application.candidate.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm border-b border-midnight-900/5 pb-2">
              <DocumentLink documentId={d.id} label={d.type} className="text-gold-600 hover:underline capitalize" />
              <DocumentVerifyControls documentId={d.id} initialStatus={d.verification_status} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-midnight-900/10">
          <SearchableSelect
            value={uploadType}
            onChange={setUploadType}
            className="w-auto"
            options={docTypes.map((t) => ({ value: t.key, label: t.label }))}
          />
          <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <button onClick={uploadDocument} disabled={!uploadFile} className="btn-primary text-xs disabled:opacity-40">Upload</button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Contract (SRS FR-4.3)</h3>
        {data.contract ? (
          <div className="space-y-3">
            <span className={`badge-${data.contract.status === "signed" ? "approved" : "pending"} capitalize`}>{data.contract.status}</span>
            <pre className="text-xs bg-ivory-100 rounded-lg p-4 whitespace-pre-wrap max-h-60 overflow-y-auto">{data.contract.content}</pre>
            {data.contract.signed_at && (
              <p className="text-xs text-midnight-900/50">Signed by {data.contract.signed_by_name} on {new Date(data.contract.signed_at).toLocaleString()}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-midnight-900/45">
              Generates a contract the candidate can sign from their own dashboard (a real, typed-attestation e-signature — the paid vendor integration is Phase 5).
            </p>
            <textarea
              value={contractContent}
              onChange={(e) => setContractContent(e.target.value)}
              rows={5}
              className="input-field text-sm resize-none"
              placeholder={`Offer of employment for ${data.application.job?.title ?? data.application.preferred_sector?.name ?? "the candidate's programme"}...`}
            />
            <button onClick={generateContract} disabled={!contractContent.trim()} className="btn-primary text-xs disabled:opacity-40">Issue Contract</button>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Milestone Payments (SRS FR-4.5)</h3>
        {!feeEnabled ? (
          <p className="text-xs text-midnight-900/45">Milestone payments are not enabled for this destination. In-House can enable this under Fee Policy.</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {data.payments.length === 0 && <p className="text-sm text-midnight-900/40">No payments recorded yet.</p>}
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b border-midnight-900/5 pb-2">
                  <span className="capitalize text-midnight-900">{p.type}: {p.currency} {p.amount.toLocaleString()}</span>
                  <span className="text-midnight-900/45 text-xs">{p.receipt_reference ?? "—"} · {p.recorder.full_name}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-midnight-900/10">
              <SearchableSelect
                value={payType}
                onChange={(value) => setPayType(value as "documentation" | "permit" | "visa")}
                className="w-auto"
                options={[
                  { value: "documentation", label: "Documentation (Stage 1 · 20%)" },
                  { value: "permit", label: "Work Permit (Stage 2 · 40%)" },
                  { value: "visa", label: "Visa (Stage 3 · 40%)" },
                ]}
              />
              <input type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input-field text-sm w-28" placeholder="Amount" />
              <input value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} className="input-field text-sm" placeholder="Receipt reference" />
              <button onClick={recordPayment} disabled={!payAmount} className="btn-primary text-xs disabled:opacity-40">Record</button>
            </div>
          </>
        )}
      </div>

      {data.retention_follow_up && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">90-Day Retention Follow-Up (SRS FR-4.7)</h3>
          <p className="text-sm text-midnight-900/70">Due {new Date(data.retention_follow_up.due_at).toLocaleDateString()}</p>
          {data.retention_follow_up.completed_at ? (
            <span className="badge-approved mt-2 inline-block">Completed</span>
          ) : (
            <button onClick={completeRetention} className="btn-primary text-xs mt-3">Mark Complete</button>
          )}
        </div>
      )}
    </div>
  );
}
