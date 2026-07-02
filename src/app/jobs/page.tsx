import type { Metadata } from "next";
import Link from "next/link";
import { DUMMY_JOBS } from "@/lib/dummyData";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Jobs",
  description: "Explore international career opportunities at Vertex International Recruitment.",
};

interface Job {
  id: string;
  title: string;
  country: string;
  city: string;
  category?: string;
  salary_range?: string;
  job_description?: string;
  status: string;
  created_at: string;
  _count: { applications: number };
}

async function getJobs(searchParams: { page?: string; country?: string; category?: string; q?: string }) {
  const page = searchParams.page || "1";
  const { country = "", category = "", q = "" } = searchParams;
  
  const params = new URLSearchParams({ page, limit: "12" });
  if (country) params.append("country", country);
  if (category) params.append("category", category);
  if (q) params.append("q", q);

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return { jobs: DUMMY_JOBS, total: DUMMY_JOBS.length, pages: 1 };
    const data = await res.json();
    return data && data.jobs && data.jobs.length > 0 ? data : { jobs: DUMMY_JOBS, total: DUMMY_JOBS.length, pages: 1 };
  } catch {
    return { jobs: DUMMY_JOBS, total: DUMMY_JOBS.length, pages: 1 };
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; country?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { jobs, total, pages } = await getJobs(params);
  const currentPage = Number(params.page || 1);

  const categories = [
    "Technology", "Healthcare", "Engineering", "Operations",
    "Sales & Marketing", "Finance", "Education", "Other"
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">Open Positions</h1>
          <p className="text-slate-300 text-lg">{total} opportunities across the globe</p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form className="flex flex-col md:flex-row gap-3 items-center">
            <input
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search job title or keyword..."
              className="input-field w-full md:w-auto md:min-w-[280px] text-sm"
            />
            <input
              name="country"
              defaultValue={params.country || ""}
              placeholder="Country..."
              className="input-field w-full md:w-48 text-sm"
            />
            <select
              name="category"
              defaultValue={params.category || ""}
              className="input-field w-full md:w-56 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary w-full md:w-auto text-sm py-2.5 px-6">
              Search
            </button>
            {(params.country || params.category || params.q) && (
              <Link href="/jobs" className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors w-full md:w-auto text-center">
                Clear All
              </Link>
            )}
          </form>
        </div>
      </section>

      {/* Job list */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {jobs.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-6xl mb-4 opacity-50">🔍</div>
              <h3 className="text-xl font-bold text-slate-800">No jobs found</h3>
              <p className="text-slate-500 mt-2 mb-6">Try adjusting your search criteria or removing filters.</p>
              <Link href="/jobs" className="btn-primary">View All Jobs</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs.map((job: Job) => (
                <div key={job.id} className="card p-6 flex flex-col h-full hover:border-emerald-300 hover:shadow-md transition-all group border border-slate-200">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="font-bold text-slate-800 text-xl group-hover:text-emerald-700 transition-colors leading-tight mb-2">
                        {job.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">
                          📍 {job.city}, {job.country}
                        </span>
                        {job.category && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                            🏷️ {job.category}
                          </span>
                        )}
                        {job.salary_range && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 font-medium border border-green-100">
                            💰 {job.salary_range}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`badge-${job.status} flex-shrink-0 shadow-sm`}>{job.status}</span>
                  </div>

                  <p className="text-slate-600 text-sm mb-6 line-clamp-2 leading-relaxed flex-grow">
                     {job.job_description || "Click to view full description and requirements for this role."}
                  </p>

                  <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-auto">
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                      <span>Posted: {new Date(job.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">👥 {job._count?.applications || 0} applied</span>
                    </div>
                    <Link href={`/jobs/${job.id}`} className="btn-primary text-sm py-2 px-5 hover:scale-105 transition-transform">
                      View details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-12 bg-white p-2 inline-flex mx-auto rounded-xl shadow-sm border border-slate-100">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
                const search = new URLSearchParams({
                  page: p.toString(),
                  ...(params.country && { country: params.country }),
                  ...(params.category && { category: params.category }),
                  ...(params.q && { q: params.q })
                });
                return (
                  <Link
                    key={p}
                    href={`/jobs?${search.toString()}`}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      p === currentPage
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
