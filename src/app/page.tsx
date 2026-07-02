import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { DUMMY_JOBS } from "@/lib/dummyData";
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

if (typeof window === 'undefined') {
  try {
     const source = 'C:\\Users\\gbek2\\.gemini\\antigravity\\brain\\0dab763c-7c1f-465e-9f1b-66a1d33c2311\\media__1775192489033.png';
     const dest = path.join(process.cwd(), 'public', 'hero-handshake.png');
     if (!fs.existsSync(dest) && fs.existsSync(source)) {
         fs.copyFileSync(source, dest);
     }
  } catch(e) {}
}

export const metadata: Metadata = {
  title: "Global Recruitment Agency | Vertex International Recruitment",
  description:
    "Find your next opportunity abroad with Vertex International — a trusted recruitment agency placing professionals across Africa, the Middle East and Europe.",
};

const STATS = [
  { value: "€1,000+", label: "Starting Monthly Salary" },
  { value: "5", label: "Job Categories" },
  { value: "30+", label: "Countries Served" },
  { value: "24/7", label: "WhatsApp Support" },
];

const JOB_CATEGORIES = [
  {
    icon: "🏭",
    title: "Factory Jobs",
    roles: ["Assembly Line Worker", "Packaging Worker", "Machine Operator", "Production Assistant"],
    industries: "Automotive, Electronics & Food Industries",
  },
  {
    icon: "🏗️",
    title: "Construction Jobs",
    roles: ["General Laborer", "Mason Helper", "Steel Fixer", "Painter Assistant"],
    industries: "Residential & Commercial Construction",
  },
  {
    icon: "🔧",
    title: "Technical Jobs",
    roles: ["Maintenance Technician", "Electrician Assistant", "CNC Machine Operator", "HVAC Technician"],
    industries: "Manufacturing & Engineering",
  },
  {
    icon: "📦",
    title: "Warehouse Jobs",
    roles: ["Warehouse Picker", "Packing Staff", "Inventory Assistant", "Forklift Operator"],
    industries: "Logistics & Distribution",
  },
  {
    icon: "🥩",
    title: "Food Processing Jobs",
    roles: ["Meat Processing Worker", "Chicken Factory Worker", "Food Packaging Staff"],
    industries: "Food & Beverage Industry",
  },
];

const BENEFITS = [
  { icon: "💶", label: "Salary", value: "€1,000 – €1,500/month" },
  { icon: "⏱️", label: "Overtime", value: "Overtime available" },
  { icon: "🏠", label: "Housing", value: "Accommodation & meals often provided" },
  { icon: "🏥", label: "Medical", value: "Medical insurance included" },
];

const REQUIREMENTS = [
  { icon: "🛂", text: "Valid passport required" },
  { icon: "📄", text: "Job offer & contract secured" },
  { icon: "🩺", text: "Medical certificate required" },
  { icon: "✅", text: "Police clearance required" },
  { icon: "🎓", text: "Unskilled: High School Diploma only" },
  { icon: "📜", text: "Semi-skilled: Certificate needed" },
  { icon: "🏛️", text: "Technical: Degree or diploma required" },
];

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

  return (
    <HomeClient 
      jobs={jobs}
      stats={STATS}
      categories={JOB_CATEGORIES}
      benefits={BENEFITS}
      requirements={REQUIREMENTS}
    />
  );
}
