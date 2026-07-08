"use client";

import { useEffect, useState } from "react";

interface Job {
  id: string;
  title: string;
  country: string;
  city: string;
}

interface Props {
  candidateId: string;
  onSubmitted: () => void;
}

/**
 * Lets a recruiter submit a real job application on behalf of a guided-to-
 * apply candidate who has no account of their own yet (SRS FR-2.1). This is
 * what actually advances the candidate to "submitted" — there's no manual
 * status flag anymore, only a genuine Application record.
 */
export default function CandidateApplyOnBehalf({ candidateId, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/jobs?limit=50")
      .then((r) => r.json())
      .then((res) => {
        const list: Job[] = res.jobs ?? [];
        setJobs(list);
        if (list.length > 0) setJobId(list[0].id);
      })
      .catch(() => setError("Failed to load jobs."));
  }, [open]);

  const submit = async () => {
    if (!jobId) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to submit application.");
        return;
      }
      setOpen(false);
      onSubmitted();
    } catch {
      setError("Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-gold-600 hover:underline"
      >
        Submit application on their behalf
      </button>
    );
  }

  return (
    <div className="bg-ivory-100 border border-midnight-900/10 rounded-lg p-3 space-y-2 max-w-xs">
      {jobs.length === 0 ? (
        <p className="text-xs text-midnight-900/50">No active jobs available right now.</p>
      ) : (
        <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="input-field py-1.5 text-xs w-full">
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title} — {j.city}, {j.country}</option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting || jobs.length === 0}
          onClick={submit}
          className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary py-1.5 px-3 text-xs">
          Cancel
        </button>
      </div>
      {error && <div className="text-[10px] text-red-500">{error}</div>}
    </div>
  );
}
