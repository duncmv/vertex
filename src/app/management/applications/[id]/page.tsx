"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import DocumentLink from "@/components/DocumentLink";
import DocumentVerifyControls from "@/components/DocumentVerifyControls";

export default function ApplicationDetailedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: appId } = use(params);

  const [appData, setAppData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [interviewDate, setInterviewDate] = useState("");

  useEffect(() => {
    fetch(`/api/admin/applications/${appId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAppData(data);
        setStatus(data.application_status);
        setNotes(data.internal_notes || "");
        if (data.interview_date) {
          const dateObj = new Date(data.interview_date);
          const tzOffset = dateObj.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
          setInterviewDate(localISOTime);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [appId]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        application_status: status,
        internal_notes: notes,
      };
      if (interviewDate) {
        payload.interview_date = new Date(interviewDate).toISOString();
      }

      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save changes");

      const updated = await res.json();
      setAppData(updated);
      alert("Changes saved and emails dispatched if applicable.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      {loading ? (
        <p className="text-midnight-900/50">Loading application…</p>
      ) : error || !appData ? (
        <p className="text-red-500">{error || "Application not found"}</p>
      ) : (
        <>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-3">
                <span className="eyebrow-rule" />
                Recruitment
              </p>
              <h1 className="section-title text-3xl md:text-4xl">Application Overview.</h1>
              <p className="text-sm text-midnight-900/50 mt-2">
                For {appData.job?.title ?? appData.preferred_sector?.name ?? "General Programme"}
                {!appData.job && appData.preferred_country_1 && ` — ${appData.preferred_country_1.name}`}
              </p>
            </div>
            <Link href="/management/applications" className="text-sm font-medium text-midnight-900/50 hover:text-gold-600">
              ← Back to Applications
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Profile Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h2 className="font-semibold text-midnight-900 mb-4 border-b pb-3 border-midnight-900/10">Candidate Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-midnight-900/40 font-semibold uppercase mb-1">Full Name</div>
                    <div className="font-medium text-midnight-900">{appData.candidate.user?.full_name ?? appData.candidate.full_name ?? "— unnamed lead —"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-midnight-900/40 font-semibold uppercase mb-1">Email</div>
                    <div className="font-medium text-midnight-900">{appData.candidate.user?.email ?? appData.candidate.email ?? "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-midnight-900/40 font-semibold uppercase mb-1">Phone</div>
                    <div className="font-medium text-midnight-900">{appData.candidate.user?.phone ?? appData.candidate.phone ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-midnight-900/40 font-semibold uppercase mb-1">Nationality / Country</div>
                    <div className="font-medium text-midnight-900">{appData.candidate.nationality || appData.candidate.user?.country || 'N/A'}</div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                  {(["cv", "passport"] as const).map((type) => {
                    const doc = appData.candidate.documents?.find((d: { type: string }) => d.type === type);
                    const label = type === "cv" ? "📄 View CV" : "🛂 View Passport";
                    if (!doc) {
                      return (
                        <span key={type} className="py-2 px-4 text-sm bg-ivory-100 text-midnight-900/35 rounded-md">
                          {type === "cv" ? "No CV" : "No Passport"}
                        </span>
                      );
                    }
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <DocumentLink documentId={doc.id} label={label} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2" />
                        <DocumentVerifyControls documentId={doc.id} initialStatus={doc.verification_status} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card p-6">
                <h2 className="font-semibold text-midnight-900 mb-4 border-b pb-3 border-midnight-900/10">Cover Letter</h2>
                <div className="whitespace-pre-wrap text-sm text-midnight-900/70 bg-ivory-100 p-4 rounded-lg border border-midnight-900/10">
                  {appData.cover_letter || "No cover letter provided."}
                </div>
              </div>
            </div>

            {/* Action Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card p-6 border-t-4 border-gold-400">
                <h2 className="font-semibold text-midnight-900 mb-4">Application Actions</h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Current Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="input-field w-full text-sm font-semibold"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="interview">Interview</option>
                      <option value="rejected">Rejected</option>
                      <option value="approved">Approved (Hired)</option>
                    </select>
                  </div>

                  {status === "interview" && (
                    <div className="p-4 bg-gold-300/10 border border-gold-400/30 rounded-lg">
                      <label className="block text-sm font-semibold text-midnight-900 mb-1.5">Schedule Interview</label>
                      <p className="text-xs text-midnight-900/50 mb-3">An email will be sent automatically with this date/time.</p>
                      <input
                        type="datetime-local"
                        value={interviewDate}
                        onChange={e => setInterviewDate(e.target.value)}
                        className="input-field w-full text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Internal Notes (Hidden from candidate)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={6}
                      placeholder="Recruiter notes, feedback, interview links..."
                      className="input-field w-full text-sm resize-y"
                    />
                  </div>

                  <div className="pt-2 border-t border-midnight-900/10">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full btn-primary py-2.5"
                    >
                      {saving ? "Saving..." : "Save Updates"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </PortalShell>
  );
}
