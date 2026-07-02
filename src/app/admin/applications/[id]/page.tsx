"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ApplicationDetailedPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
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
          // Format for datetime-local input
          const dateObj = new Date(data.interview_date);
          const tzOffset = dateObj.getTimezoneOffset() * 60000; // offset in milliseconds
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

  if (loading) return <div className="p-20 text-center text-slate-500">Loading Application...</div>;
  if (error || !appData) return <div className="p-20 text-center text-red-500">{error || "Application not found"}</div>;

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Application Overview</h1>
            <p className="text-sm text-slate-500 mt-1">For {appData.job.title}</p>
          </div>
          <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-emerald-600">
            ← Back to Admin
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidate Profile Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 border-slate-100">Candidate Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Full Name</div>
                  <div className="font-semibold text-slate-800">{appData.candidate.user.full_name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Email</div>
                  <div className="font-semibold text-slate-800">{appData.candidate.user.email}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Phone</div>
                  <div className="font-semibold text-slate-800">{appData.candidate.user.phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Nationality / Country</div>
                  <div className="font-semibold text-slate-800">{appData.candidate.nationality || appData.candidate.user.country || 'N/A'}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                {appData.candidate.cv_file ? (
                  <a href={appData.candidate.cv_file} target="_blank" rel="noopener noreferrer" className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                    📄 View CV
                  </a>
                ) : <span className="py-2 px-4 text-sm bg-slate-100 text-slate-400 rounded-md">No CV</span>}
                
                {appData.candidate.passport_scan ? (
                  <a href={appData.candidate.passport_scan} target="_blank" rel="noopener noreferrer" className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                    🛂 View Passport
                  </a>
                ) : <span className="py-2 px-4 text-sm bg-slate-100 text-slate-400 rounded-md">No Passport</span>}
              </div>
            </div>

            <div className="card p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 border-slate-100">Cover Letter</h2>
              <div className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                {appData.cover_letter || "No cover letter provided."}
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6 shadow-sm border-t-4 border-emerald-500">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Application Actions</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Status</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                    className="input-field w-full text-sm font-bold"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                    <option value="approved">Approved (Hired)</option>
                  </select>
                </div>

                {status === "interview" && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg animate-in fade-in">
                    <label className="block text-sm font-bold text-emerald-800 mb-1.5">Schedule Interview</label>
                    <p className="text-xs text-emerald-600 mb-3">An email will be sent automatically with this date/time.</p>
                    <input 
                      type="datetime-local" 
                      value={interviewDate}
                      onChange={e => setInterviewDate(e.target.value)}
                      className="w-full rounded-md border border-emerald-200 p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Internal Notes (Hidden from candidate)</label>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                    rows={6}
                    placeholder="Recruiter notes, feedback, interview links..."
                    className="input-field w-full text-sm resize-y bg-amber-50 focus:bg-white"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
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
      </div>
    </div>
  );
}
