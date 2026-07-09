"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { MARKETING_NAV_ITEMS } from "@/components/portal/marketingNav";
import { Plus } from "@phosphor-icons/react";

interface Job {
  id: string;
  title: string;
  status: string;
  created_at: string;
  _count: { applications: number };
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/jobs?limit=50")
      .then((r) => r.json())
      .then((res) => setJobs(res.jobs || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job? All associated applications will be removed too.")) return;
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } else {
      alert("Failed to delete job.");
    }
  };

  return (
    <PortalShell roleLabel="Marketing" navItems={MARKETING_NAV_ITEMS}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="eyebrow mb-3">
            <span className="eyebrow-rule" />
            Recruitment
          </p>
          <h1 className="section-title text-3xl md:text-4xl">Jobs.</h1>
        </div>
        <Link href="/marketing/jobs/new" className="btn-primary text-xs">
          <Plus size={16} weight="bold" /> Post New Job
        </Link>
      </div>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No jobs posted yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Job Title & Location</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Applicants</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium text-midnight-900">{job.title}</div>
                    <div className="text-xs text-midnight-900/45">Posted {new Date(job.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-4"><span className={`badge-${job.status}`}>{job.status}</span></td>
                  <td className="px-5 py-4 font-medium text-midnight-900/70">{job._count?.applications || 0} applied</td>
                  <td className="px-5 py-4 text-right space-x-4">
                    <Link href={`/jobs/${job.id}`} target="_blank" className="text-gold-600 hover:underline font-medium text-xs">View</Link>
                    <Link href={`/marketing/jobs/${job.id}/edit`} className="text-midnight-900/60 hover:text-gold-600 hover:underline font-medium text-xs">Edit</Link>
                    <button onClick={() => handleDelete(job.id)} className="text-red-500 hover:text-red-700 hover:underline font-medium text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
