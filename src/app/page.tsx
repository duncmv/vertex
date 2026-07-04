import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { DUMMY_JOBS } from "@/lib/dummyData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Global Recruitment Agency | Vertex International Recruitment",
  description:
    "Find your next opportunity abroad with Vertex International — a trusted recruitment agency placing professionals across Africa, the Middle East and Europe.",
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
