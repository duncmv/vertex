import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { DUMMY_JOBS } from "@/lib/dummyData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Global Recruitment & Mobility | Vertex International Recruitment Ltd.",
  description:
    "Vertex International Recruitment Ltd. connects talented professionals, employers, agencies and institutional partners through ethical recruitment, compliant mobility solutions, and dedicated end-to-end support.",
};

async function getFeaturedJobs() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs?limit=6`, {
      cache: "no-store",
    });
    if (!res.ok) return DUMMY_JOBS.slice(0, 6);
    const data = await res.json();
    return data.jobs && data.jobs.length > 0 ? data.jobs : DUMMY_JOBS.slice(0, 6);
  } catch {
    return DUMMY_JOBS.slice(0, 6);
  }
}

export default async function HomePage() {
  const jobs = await getFeaturedJobs();

  return <HomeClient jobs={jobs} />;
}
