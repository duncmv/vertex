import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";

interface Job {
  id: string;
  title: string;
  country: string;
  city: string;
  category?: string;
  salary_range?: string;
  job_description: string;
  requirements: string;
  status: string;
  created_at: string;
  _count: { applications: number };
}

async function getJob(id: string): Promise<Job | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ? data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return { title: "Job Not Found" };
  return {
    title: `${job.title} — ${job.city}, ${job.country}`,
    description: job.job_description.slice(0, 160),
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-3 text-sm flex items-center gap-2">
          <Link href="/jobs" className="text-slate-500 hover:text-emerald-700 font-medium">Jobs</Link>
          <span className="text-slate-300">›</span>
          <span className="text-slate-800 font-medium truncate">{job.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-slate-100 relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                  📍 {job.city}, {job.country}
                </span>
                {job.category && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                    🏷️ {job.category}
                  </span>
                )}
                {job.salary_range && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-50 text-green-700 font-medium border border-green-100">
                    💰 {job.salary_range}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 font-medium border border-slate-200">
                  👥 {job._count.applications} applied
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 font-medium border border-slate-200">
                  📅 {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className={`badge-${job.status} text-sm px-4 py-1.5 shadow-sm inline-block`}>{job.status}</span>
            </div>
          </div>

          {/* Apply button */}
          {job.status === "active" ? (
            <Link href={`/apply?job=${job.id}`} className="btn-gold w-full sm:w-auto mb-8 text-base py-3.5">
              Apply for This Position
            </Link>
          ) : (
            <div className="bg-slate-100 text-slate-500 rounded-lg p-4 mb-8 text-sm">
              This position is no longer accepting applications.
            </div>
          )}

          {/* Description */}
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-bold text-slate-800 mb-3">Job Description</h2>
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap mb-8">
              {job.job_description}
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-3">Requirements</h2>
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
              {job.requirements}
            </div>
          </div>

          {/* Bottom apply */}
          {job.status === "active" && (
            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
              <p className="text-slate-500 mb-4">Interested in this role?</p>
              <Link href={`/apply?job=${job.id}`} className="btn-primary px-8 py-3.5 text-base">
                Apply Now
              </Link>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/jobs" className="text-sm text-slate-500 hover:text-emerald-700">← Back to All Jobs</Link>
        </div>
      </div>
    </div>
  );
}
