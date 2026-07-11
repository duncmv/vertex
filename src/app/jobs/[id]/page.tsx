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
  visa_type?: string;
  duration_permit?: string;
  processing_time?: string;
  service_fee_gbp?: number;
  visa_success_rates?: string;
  _count: { applications: number };
}

// Every work-permit programme in the Service & Pricing List follows the
// same fixed three-stage split of the total service fee — only the total
// is stored (Job.service_fee_gbp), so the stage amounts are derived here.
const feeStages = (totalGbp: number) => [
  { label: "Stage 1 · 20%", note: "On engagement — documentation", amount: Math.round(totalGbp * 0.2) },
  { label: "Stage 2 · 40%", note: "After the work permit is issued", amount: Math.round(totalGbp * 0.4) },
  { label: "Stage 3 · 40%", note: "After the visa is granted", amount: Math.round(totalGbp * 0.4) },
];

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

          {/* Programme details */}
          {(job.visa_type || job.duration_permit || job.processing_time || job.service_fee_gbp != null) && (
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {job.visa_type && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">Visa Type</div>
                  <div className="text-slate-800 font-medium">{job.visa_type}</div>
                </div>
              )}
              {job.duration_permit && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">Duration / Permit</div>
                  <div className="text-slate-800 font-medium">{job.duration_permit}</div>
                </div>
              )}
              {job.processing_time && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">Processing Time</div>
                  <div className="text-slate-800 font-medium">{job.processing_time}</div>
                </div>
              )}
            </div>
          )}

          {/* Service fee */}
          {job.service_fee_gbp != null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 mb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h2 className="text-xl font-bold text-slate-800">Service Fee</h2>
                <span className="text-2xl font-black text-emerald-800">{job.service_fee_gbp.toLocaleString()} GBP</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mb-3">
                {feeStages(job.service_fee_gbp).map((stage) => (
                  <div key={stage.label} className="bg-white rounded-lg p-3 text-center border border-emerald-100">
                    <div className="font-bold text-emerald-700 text-sm mb-1">{stage.label}</div>
                    <div className="text-slate-800 font-semibold">{stage.amount.toLocaleString()} GBP</div>
                    <div className="text-slate-500 text-xs mt-1">{stage.note}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Air tickets and embassy fees are not included and are payable separately. Accommodation is provided
                (may be deducted from salary).
              </p>
            </div>
          )}

          {/* Visa success rate */}
          {job.visa_success_rates && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-3">Visa Success Rate by Region</h2>
              <p className="text-slate-600">{job.visa_success_rates}</p>
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
