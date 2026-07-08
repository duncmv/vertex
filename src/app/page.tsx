import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Global Recruitment & Mobility | Vertex International Recruitment Ltd.",
  description:
    "Vertex International Recruitment Ltd. connects talented professionals, employers, agencies and institutional partners through ethical recruitment, compliant mobility solutions, and dedicated end-to-end support.",
};

// SRS FR-1.5: real database jobs only — no placeholder fallback. An empty
// result renders HomeClient's built-in "No jobs available yet" state.
async function getFeaturedJobs() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs?limit=6`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.jobs ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const jobs = await getFeaturedJobs();

  return <HomeClient jobs={jobs} />;
}
