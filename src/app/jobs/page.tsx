import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Tag, CurrencyCircleDollar, Users, ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
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
    if (!res.ok) return { jobs: [], total: 0, pages: 1 };
    const data = await res.json();
    return data?.jobs ? data : { jobs: [], total: 0, pages: 1 };
  } catch {
    return { jobs: [], total: 0, pages: 1 };
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
    <div className="bg-ivory-50 min-h-screen">
      {/* Header */}
      <section className="bg-midnight-950 text-ivory-50 py-20 md:py-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="eyebrow-dark mb-6">
            <span className="eyebrow-rule" />
            Careers abroad
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] mb-4">
            Open positions.
          </h1>
          <p className="text-ivory-50/50 text-lg font-light">{total} opportunities across the globe</p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-ivory-50/95 backdrop-blur-md border-b border-midnight-900/10 sticky top-20 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
            <button type="submit" className="btn-primary w-full md:w-auto text-xs py-3 px-7">
              <MagnifyingGlass size={14} weight="bold" /> Search
            </button>
            {(params.country || params.category || params.q) && (
              <Link href="/jobs" className="text-sm font-medium text-midnight-900/50 hover:text-red-600 transition-colors w-full md:w-auto text-center">
                Clear All
              </Link>
            )}
          </form>
        </div>
      </section>

      {/* Job list */}
      <section className="py-14 md:py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          {jobs.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-midnight-900/10">
              <h3 className="text-xl font-semibold text-midnight-900 tracking-tight">No jobs found</h3>
              <p className="text-midnight-900/50 font-light mt-2 mb-8">Try adjusting your search criteria or removing filters.</p>
              <Link href="/jobs" className="btn-primary">View All Jobs</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs.map((job: Job) => (
                <div
                  key={job.id}
                  className="bg-white border border-midnight-900/10 rounded-2xl p-8 flex flex-col h-full hover:border-gold-500/60 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h2 className="font-semibold text-midnight-900 text-xl md:text-2xl tracking-tight group-hover:text-midnight-700 transition-colors leading-tight mb-3">
                        {job.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-midnight-900/55 font-light">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={15} weight="regular" /> {job.city}, {job.country}
                        </span>
                        {job.category && (
                          <span className="inline-flex items-center gap-1.5">
                            <Tag size={15} weight="regular" /> {job.category}
                          </span>
                        )}
                        {job.salary_range && (
                          <span className="inline-flex items-center gap-1.5 text-midnight-800 font-medium">
                            <CurrencyCircleDollar size={15} weight="regular" /> {job.salary_range}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`badge-${job.status} flex-shrink-0`}>{job.status}</span>
                  </div>

                  <p className="text-midnight-900/60 text-sm font-light mb-8 line-clamp-2 leading-relaxed flex-grow">
                    {job.job_description || "Click to view full description and requirements for this role."}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-midnight-900/10 mt-auto">
                    <div className="flex items-center gap-5 text-xs text-midnight-900/40 uppercase tracking-[0.1em]">
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} weight="regular" /> {job._count?.applications || 0} applied
                      </span>
                    </div>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-midnight-800 hover:text-gold-600 transition-colors"
                    >
                      View details <ArrowRight size={14} weight="bold" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center mt-14">
              <div className="flex gap-1 bg-white p-1.5 rounded-full border border-midnight-900/10">
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
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        p === currentPage
                          ? "bg-midnight-800 text-ivory-50"
                          : "text-midnight-900/60 hover:bg-ivory-100"
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
