"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { MARKETING_NAV_ITEMS } from "@/components/portal/marketingNav";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: jobId } = use(params);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    country: "",
    city: "",
    category: "",
    salary_range: "",
    job_description: "",
    requirements: "",
    status: "active",
  });

  const categories = [
    "Technology", "Healthcare", "Engineering", "Operations",
    "Sales & Marketing", "Finance", "Education", "Other"
  ];

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setFormData({
          title: data.title,
          country: data.country,
          city: data.city,
          category: data.category || "",
          salary_range: data.salary_range || "",
          job_description: data.job_description,
          requirements: data.requirements,
          status: data.status,
        });
        setFetching(false);
      })
      .catch(() => {
        setError("Failed to load job details.");
        setFetching(false);
      });
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/marketing/jobs");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to edit job.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <PortalShell roleLabel="Marketing" navItems={MARKETING_NAV_ITEMS}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="eyebrow mb-3">
            <span className="eyebrow-rule" />
            Recruitment
          </p>
          <h1 className="section-title text-3xl md:text-4xl">Edit Job Posting.</h1>
        </div>
        <Link href="/marketing/jobs" className="text-sm font-medium text-midnight-900/50 hover:text-gold-600">
          ← Back to Jobs
        </Link>
      </div>

      {fetching ? (
        <p className="text-midnight-900/50">Loading job details…</p>
      ) : (
        <div className="card p-6 md:p-8 max-w-3xl">
          {error && <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Job Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="input-field w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Country</label>
                <input required type="text" name="country" value={formData.country} onChange={handleChange} className="input-field w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">City</label>
                <input required type="text" name="city" value={formData.city} onChange={handleChange} className="input-field w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="input-field w-full">
                  <option value="">Select a Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Salary Range <span className="text-midnight-900/35 font-normal">(Optional)</span></label>
                <input type="text" name="salary_range" value={formData.salary_range} onChange={handleChange} className="input-field w-full" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="input-field w-full max-w-xs">
                  <option value="active">Active (Open)</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Job Description</label>
                <textarea required name="job_description" value={formData.job_description} onChange={handleChange} rows={5} className="input-field w-full resize-y" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-midnight-900/70 mb-1.5">Requirements</label>
                <textarea required name="requirements" value={formData.requirements} onChange={handleChange} rows={5} className="input-field w-full resize-y" />
              </div>

              <div className="col-span-1 md:col-span-2 border-t border-midnight-900/10 pt-6 mt-2 flex justify-end gap-4">
                <Link href="/marketing/jobs" className="btn-secondary py-2.5 px-6">Cancel</Link>
                <button type="submit" disabled={loading} className="btn-primary py-2.5 px-8 disabled:opacity-70">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </PortalShell>
  );
}
