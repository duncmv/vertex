"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  AirplaneTilt,
  ArrowRight,
  ArrowUpRight,
  Buildings,
  Certificate,
  ChatCircleText,
  Check,
  CheckCircle,
  Clock,
  CurrencyEur,
  EnvelopeSimple,
  Factory,
  FirstAid,
  ForkKnife,
  GraduationCap,
  HardHat,
  House,
  MapPin,
  Package,
  PaperPlaneTilt,
  Plus,
  SealCheck,
  Wrench,
} from "@phosphor-icons/react";

/* ===== Static marketing content ===== */

const STATS = [
  { value: "€1,000+", label: "Starting Monthly Salary" },
  { value: "5", label: "Job Sectors" },
  { value: "30+", label: "Countries Served" },
  { value: "24/7", label: "WhatsApp Support" },
];

const SECTORS = [
  {
    icon: Factory,
    title: "Factory",
    industries: "Automotive, Electronics & Food Industries",
    roles: ["Assembly Line Worker", "Packaging Worker", "Machine Operator", "Production Assistant"],
  },
  {
    icon: HardHat,
    title: "Construction",
    industries: "Residential & Commercial Construction",
    roles: ["General Laborer", "Mason Helper", "Steel Fixer", "Painter Assistant"],
  },
  {
    icon: Wrench,
    title: "Technical",
    industries: "Manufacturing & Engineering",
    roles: ["Maintenance Technician", "Electrician Assistant", "CNC Machine Operator", "HVAC Technician"],
  },
  {
    icon: Package,
    title: "Warehouse",
    industries: "Logistics & Distribution",
    roles: ["Warehouse Picker", "Packing Staff", "Inventory Assistant", "Forklift Operator"],
  },
  {
    icon: ForkKnife,
    title: "Food Processing",
    industries: "Food & Beverage Industry",
    roles: ["Meat Processing Worker", "Chicken Factory Worker", "Food Packaging Staff"],
  },
];

const DESTINATIONS = [
  {
    country: "Hungary",
    href: "/apply/hungary",
    tag: "Official Partner",
    blurb: "Factory, warehouse and food processing roles with EU work permits and full relocation guidance.",
    featured: true,
  },
  {
    country: "Greece",
    href: "/apply/greece",
    tag: "Now Recruiting",
    blurb: "Seasonal and long-term placements across hospitality, agriculture and logistics.",
    featured: false,
  },
  {
    country: "Wider Europe",
    href: "/jobs",
    tag: "30+ Countries",
    blurb: "Browse every open position across our full network of vetted employers.",
    featured: false,
  },
];

const CANDIDATE_STEPS: { name: string; text: string; pictogram: "apply" | "match" | "fly" }[] = [
  {
    name: "Apply",
    text: "Create your free profile, choose a role and submit your application with your documents online.",
    pictogram: "apply",
  },
  {
    name: "Match",
    text: "We verify your passport, medical and police clearance, then match you with a vetted employer abroad.",
    pictogram: "match",
  },
  {
    name: "Relocate",
    text: "With your contract signed and visa secured, we arrange your travel — you arrive with accommodation ready and begin work.",
    pictogram: "fly",
  },
];

const BENEFITS = [
  { icon: CurrencyEur, label: "Salary", value: "€1,000 – €1,500 per month" },
  { icon: Clock, label: "Overtime", value: "Overtime available" },
  { icon: House, label: "Housing", value: "Accommodation & meals often provided" },
  { icon: FirstAid, label: "Medical", value: "Medical insurance included" },
];

const REQUIREMENTS = [
  "Valid passport",
  "Job offer & contract secured",
  "Medical certificate",
  "Police clearance",
];

const QUALIFICATION_TIERS = [
  { icon: GraduationCap, title: "Unskilled", text: "High school diploma is all you need." },
  { icon: Certificate, title: "Semi-skilled", text: "A trade certificate in your field." },
  { icon: Buildings, title: "Technical", text: "A degree or diploma is required." },
];

const FAQS = [
  {
    q: "Who can apply through Vertex International?",
    a: "Anyone with a valid passport who meets the qualification level for their chosen role — from unskilled positions requiring only a high school diploma, to technical roles requiring a degree or diploma.",
  },
  {
    q: "What documents do I need?",
    a: "A valid passport, a medical certificate and a police clearance. Once you are matched with an employer, we help you secure the job offer and contract before any travel arrangements are made.",
  },
  {
    q: "What salary can I expect?",
    a: "Placements typically start from €1,000 to €1,500 per month, with overtime available in most roles. Accommodation and meals are often provided by the employer.",
  },
  {
    q: "Which countries do you place candidates in?",
    a: "Our flagship programs are in Hungary and Greece, and our wider network covers placements across more than 30 countries in Europe and the Middle East.",
  },
  {
    q: "How do I get support during the process?",
    a: "Our team is available around the clock on WhatsApp and Telegram, and you can track every application from your personal dashboard.",
  },
];

const WHATSAPP_NUMBERS = ["+44 7440 167608", "+44 7438 299563", "+44 7405 368405", "+44 7438 613251"];

/* ===== Animated figures (midnight-am style pictograms, drawn in-house) ===== */

function PersonFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 96" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="18" r="12" stroke="currentColor" strokeWidth="3" />
      <path
        d="M12 90 C12 62 20 46 32 46 C44 46 52 62 52 90"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ===== Hero program finder =====
   Peninsula-style glass widget: pick a destination program without leaving
   the hero. Frosted card, pill tabs, check-badges, one clear CTA. */

const HERO_PROGRAMS = [
  {
    id: "hungary",
    label: "Hungary",
    tag: "Official Partner",
    sealed: true,
    headline: "Work in Hungary",
    points: ["EU work permit sponsored", "Accommodation & meals arranged", "€1,000 – €1,500 per month"],
    text: "Factory, warehouse and food processing roles with full relocation guidance.",
    href: "/apply/hungary",
    cta: "View Hungary Program",
  },
  {
    id: "greece",
    label: "Greece",
    tag: "Now Recruiting",
    sealed: false,
    headline: "Work in Greece",
    points: ["Seasonal & long-term contracts", "Hospitality, agriculture & logistics", "Visa support included"],
    text: "Placements across the Greek mainland and islands, matched to your experience.",
    href: "/apply/greece",
    cta: "View Greece Program",
  },
  {
    id: "all",
    label: "All Roles",
    tag: "30+ Countries",
    sealed: false,
    headline: "Browse every role",
    points: ["Five sectors, one standard", "Vetted employers only", "24/7 WhatsApp support"],
    text: "Explore every open position across our full network of vetted employers.",
    href: "/jobs",
    cta: "Browse All Jobs",
  },
];

function HeroProgramWidget() {
  const [active, setActive] = useState(0);
  const program = HERO_PROGRAMS[active];
  return (
    <div className="w-full max-w-[480px] lg:ml-auto rounded-3xl border border-white/20 bg-white/[0.07] backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_24px_60px_-15px_rgba(0,0,0,0.6)] p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ivory-50/50">
          Find your program
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
          Now hiring
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-7" role="tablist" aria-label="Destination programs">
        {HERO_PROGRAMS.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] border transition-all duration-200 ${
              i === active
                ? "bg-gold-400 text-midnight-950 border-gold-400"
                : "bg-white/10 text-ivory-50/70 border-white/20 hover:bg-white/15 hover:text-ivory-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <motion.div
        key={program.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-300 mb-3">
          {program.sealed && <SealCheck size={14} weight="fill" />}
          {program.tag}
        </p>
        <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-ivory-50 mb-5">
          {program.headline}
        </h3>
        <ul className="space-y-2.5 mb-5">
          {program.points.map((point) => (
            <li key={point} className="flex items-center gap-2.5 text-sm text-ivory-50/75 font-light">
              <span className="flex items-center justify-center w-4.5 h-4.5 shrink-0 text-gold-300">
                <Check size={15} weight="bold" />
              </span>
              {point}
            </li>
          ))}
        </ul>
        <p className="text-sm text-ivory-50/50 font-light leading-relaxed mb-6">{program.text}</p>
        <Link href={program.href} className="btn-gold w-full py-3.5 text-[12px]">
          {program.cta} <ArrowRight size={15} weight="bold" />
        </Link>
      </motion.div>

      <p className="mt-5 text-center text-[11px] text-ivory-50/40 font-light">
        Free to register · Guided at every step
      </p>
    </div>
  );
}

/* Looping pictograms for the candidate process steps — drawn in currentColor
   so they sit directly on each card's background, midnight-am style. */
function StepPictogram({ type }: { type: "apply" | "match" | "fly" }) {
  return (
    <div className="relative h-44 w-full flex items-center justify-center">
      {type === "apply" && (
        <div className="relative w-24 h-28 border-[3px] border-current rounded-lg p-3.5 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ scaleX: [0, 1, 1, 0] }}
              transition={{ duration: 3.2, times: [0, 0.2, 0.9, 1], delay: i * 0.35, repeat: Infinity, ease: "easeOut" }}
              className="block h-1.5 bg-current opacity-50 rounded-full origin-left"
            />
          ))}
          <motion.span
            animate={{ scale: [0, 1.15, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: 3.2, times: [0.4, 0.5, 0.55, 0.9, 1], repeat: Infinity, ease: "easeOut" }}
            className="absolute -bottom-3.5 -right-3.5 w-9 h-9 rounded-full border-[3px] border-current flex items-center justify-center"
          >
            <Check size={18} weight="bold" />
          </motion.span>
        </div>
      )}

      {type === "match" && (
        <div className="relative flex items-center justify-center w-full">
          <motion.div
            animate={{ x: [-48, -22, -22, -48], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.6, times: [0, 0.3, 0.85, 1], repeat: Infinity, ease: "easeInOut" }}
          >
            <PersonFigure className="w-14 h-[84px]" />
          </motion.div>
          <motion.span
            animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.6, times: [0.35, 0.45, 0.85, 1], repeat: Infinity, ease: "easeOut" }}
            className="w-2.5 h-2.5 rounded-full bg-current mx-1"
          />
          <motion.div
            animate={{ x: [48, 22, 22, 48], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.6, times: [0, 0.3, 0.85, 1], repeat: Infinity, ease: "easeInOut" }}
            className="opacity-60"
          >
            <PersonFigure className="w-14 h-[84px]" />
          </motion.div>
        </div>
      )}

      {type === "fly" && (
        <div className="relative w-full h-full">
          <div className="absolute left-10 right-10 top-1/2 border-t-2 border-dashed border-current opacity-30 -rotate-[14deg]" />
          <motion.div
            animate={{ x: [-64, 64], y: [26, -26], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, times: [0, 0.25, 0.8, 1], repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 -ml-5 -mt-5"
          >
            <AirplaneTilt size={40} weight="fill" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* ===== Motion helper ===== */

function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ===== Page ===== */

export default function HomeClient({ jobs }: { jobs: any[] }) {
  return (
    <div className="overflow-x-hidden">
      {/* ===== Hero ===== */}
      <section className="relative bg-midnight-950 text-ivory-50 flex flex-col justify-between min-h-[92vh]">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
          <div className="absolute -top-1/3 right-0 w-[700px] h-[700px] rounded-full bg-midnight-600/20 blur-[140px]" />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-gold-500/[0.07] blur-[120px]" />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center pt-24 pb-16">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="eyebrow-dark mb-8"
            >
              <span className="eyebrow-rule" />
              Global Recruitment — Africa · Middle East · Europe
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-[6.5rem] font-semibold leading-[0.98] tracking-tight mb-10"
            >
              Careers beyond
              <br />
              <span className="text-gold-300">borders.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg md:text-xl text-ivory-50/60 leading-relaxed mb-12 max-w-xl font-light"
            >
              Vertex International Recruitment places talented professionals with world-class employers —
              from application to visa to your first day at work.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/jobs" className="btn-gold px-9 py-4">
                Browse Open Roles <ArrowRight size={16} weight="bold" />
              </Link>
              <Link href="#process" className="btn-ghost-dark px-9 py-4">
                How It Works
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="mt-12 inline-flex items-center gap-3 text-ivory-50/50"
            >
              <SealCheck size={20} weight="fill" className="text-gold-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em]">
                Official Partner — Hungary & EU Sector
              </span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.5 }}
          >
            <HeroProgramWidget />
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative border-t border-white/10"
        >
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4">
            {STATS.map((stat, idx) => (
              <div
                key={stat.label}
                className={`py-8 md:py-10 pr-6 ${idx > 0 ? "md:border-l md:border-white/10 md:pl-8" : ""}`}
              >
                <div className="text-2xl md:text-4xl font-semibold tracking-tight text-ivory-50">{stat.value}</div>
                <div className="text-ivory-50/40 text-[11px] uppercase tracking-[0.2em] mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===== Sector marquee ===== */}
      <section className="bg-midnight-900 border-y border-white/5 py-5 overflow-hidden marquee-mask">
        <div className="flex w-max animate-marquee">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex items-center shrink-0">
              {[...SECTORS, ...SECTORS].map((s, idx) => (
                <span
                  key={`${dup}-${idx}`}
                  className="flex items-center text-[12px] font-semibold uppercase tracking-[0.35em] text-ivory-50/40"
                >
                  <span className="px-8">{s.title}</span>
                  <span className="text-gold-500/60 text-[8px]">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Our Process × Candidates ===== */}
      <section id="process" className="bg-ivory-50 py-24 md:py-32 scroll-mt-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-16 max-w-3xl">
            <p className="eyebrow mb-5">
              <span className="eyebrow-rule" />
              Our Process × Candidates
            </p>
            <h2 className="section-title">Fair, fast and guided.</h2>
            <p className="section-subtitle">
              We handle the paperwork, the employer and the visa — you focus on the journey.
              Three steps from application to arrival.
            </p>
          </FadeIn>

          <div className="process-cards grid md:grid-cols-3 gap-6">
            {CANDIDATE_STEPS.map((step, idx) => {
              const cardStyles = [
                "bg-white text-midnight-950 border border-midnight-900/10",
                "bg-midnight-900 text-ivory-100",
                "bg-gold-400 text-midnight-950",
              ];
              return (
                <FadeIn key={step.name} delay={idx * 0.1} className="h-full">
                  <div className={`process-card rounded-2xl p-8 md:p-10 h-full min-h-[440px] flex flex-col ${cardStyles[idx]}`}>
                    <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                      {idx + 1}:{step.name}
                    </h3>
                    <div className="flex-1 flex items-center justify-center py-6">
                      <StepPictogram type={step.pictogram} />
                    </div>
                    <p className="opacity-70 leading-relaxed font-light">{step.text}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Destinations ===== */}
      <section className="bg-ivory-100 py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow mb-5">
                <span className="eyebrow-rule" />
                Destinations
              </p>
              <h2 className="section-title">Where we place you.</h2>
            </div>
            <Link
              href="/jobs"
              className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-midnight-800 hover:text-gold-600 transition-colors shrink-0"
            >
              All destinations
              <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </Link>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {DESTINATIONS.map((dest, idx) => (
              <FadeIn key={dest.country} delay={idx * 0.1} className="h-full">
                <Link
                  href={dest.href}
                  className={`group flex flex-col justify-between h-full min-h-[320px] rounded-2xl p-8 transition-all duration-300 ${
                    dest.featured
                      ? "bg-midnight-900 text-ivory-50 hover:bg-midnight-800"
                      : "bg-white text-midnight-900 border border-midnight-900/10 hover:border-gold-500/60"
                  }`}
                >
                  <div>
                    <span
                      className={`inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                        dest.featured ? "text-gold-300" : "text-gold-600"
                      }`}
                    >
                      {dest.featured && <SealCheck size={14} weight="fill" />}
                      {dest.tag}
                    </span>
                    <h3 className="text-3xl md:text-4xl font-semibold tracking-tight mt-6">{dest.country}</h3>
                    <p className={`text-sm leading-relaxed mt-4 font-light ${dest.featured ? "text-ivory-50/60" : "text-midnight-900/55"}`}>
                      {dest.blurb}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-10">
                    <span className={`text-[11px] uppercase tracking-[0.2em] font-semibold ${dest.featured ? "text-ivory-50/50" : "text-midnight-900/40"}`}>
                      View program
                    </span>
                    <span
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all group-hover:translate-x-1 ${
                        dest.featured
                          ? "border-white/20 text-gold-300 group-hover:border-gold-300"
                          : "border-midnight-900/15 text-midnight-800 group-hover:border-gold-500 group-hover:text-gold-600"
                      }`}
                    >
                      <ArrowRight size={16} weight="bold" />
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Featured jobs ===== */}
      <section className="bg-ivory-50 py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow mb-5">
                <span className="eyebrow-rule" />
                Open positions
              </p>
              <h2 className="section-title">Featured opportunities.</h2>
            </div>
            <Link
              href="/jobs"
              className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-midnight-800 hover:text-gold-600 transition-colors shrink-0"
            >
              View all jobs
              <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </Link>
          </FadeIn>

          {jobs.length === 0 ? (
            <FadeIn>
              <div className="text-center py-20 border border-midnight-900/10 rounded-2xl bg-white text-midnight-900/50">
                <p className="font-light">No jobs available yet. Check back soon.</p>
              </div>
            </FadeIn>
          ) : (
            <div className="border-t border-midnight-900/10">
              {jobs.map((job: any, idx: number) => (
                <FadeIn key={job.id} delay={idx * 0.04}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="group grid grid-cols-1 md:grid-cols-[1fr_auto_auto_56px] items-start md:items-center gap-3 md:gap-10 py-7 border-b border-midnight-900/10 transition-colors hover:bg-white px-2 md:px-4 -mx-2 md:-mx-4"
                  >
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold tracking-tight text-midnight-900 group-hover:text-midnight-700 transition-colors">
                        {job.title}
                      </h3>
                      <p className="flex items-center gap-1.5 text-sm text-midnight-900/50 mt-1 font-light">
                        <MapPin size={14} weight="regular" />
                        {job.city}, {job.country}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-midnight-800 md:text-right">
                      {job.salary_range || "Competitive"}
                    </span>
                    <span className="text-xs text-midnight-900/40 uppercase tracking-[0.15em] md:text-right">
                      {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <ArrowUpRight
                      size={22}
                      weight="regular"
                      className="hidden md:block text-midnight-900/25 group-hover:text-gold-600 transition-all group-hover:translate-x-1 group-hover:-translate-y-1 justify-self-end"
                    />
                  </Link>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Package & Benefits ===== */}
      <section className="bg-midnight-950 text-ivory-50 py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-12 max-w-2xl">
            <p className="eyebrow-dark mb-5">
              <span className="eyebrow-rule" />
              Package & benefits
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-ivory-50">
              What you get when placed through Vertex.
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <FadeIn key={benefit.label} delay={idx * 0.08} className="h-full">
                  <div className="border border-white/10 rounded-2xl p-8 h-full hover:border-gold-400/50 transition-colors">
                    <Icon size={28} weight="light" className="text-gold-300 mb-6" />
                    <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ivory-50/40 mb-2">
                      {benefit.label}
                    </div>
                    <div className="text-ivory-50 font-medium leading-snug">{benefit.value}</div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Eligibility ===== */}
      <section className="bg-ivory-50 py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <FadeIn>
              <p className="eyebrow mb-5">
                <span className="eyebrow-rule" />
                Before you apply
              </p>
              <h2 className="section-title mb-6">Check your eligibility.</h2>
              <p className="text-midnight-900/60 font-light leading-relaxed mb-10 max-w-md">
                Make sure you can provide these four essentials — our team helps you prepare everything else.
              </p>
              <ul className="space-y-4">
                {REQUIREMENTS.map((req) => (
                  <li key={req} className="flex items-center gap-4 text-midnight-900">
                    <CheckCircle size={22} weight="fill" className="text-midnight-600 shrink-0" />
                    <span className="font-medium">{req}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="space-y-4">
                {QUALIFICATION_TIERS.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <div
                      key={tier.title}
                      className="flex items-start gap-5 bg-white border border-midnight-900/10 rounded-2xl p-6 hover:border-gold-500/60 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full border border-midnight-900/15 flex items-center justify-center text-midnight-800 shrink-0">
                        <Icon size={22} weight="regular" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-midnight-900">{tier.title}</h3>
                        <p className="text-sm text-midnight-900/55 mt-1 font-light">{tier.text}</p>
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="/apply"
                  className="group flex items-center justify-between bg-midnight-900 text-ivory-50 rounded-2xl p-6 hover:bg-midnight-800 transition-colors"
                >
                  <span className="font-semibold">Ready? Start your application</span>
                  <ArrowRight size={20} weight="bold" className="text-gold-300 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-ivory-100 py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-14 text-center">
            <p className="eyebrow mb-5 justify-center">
              <span className="eyebrow-rule" />
              Common questions
            </p>
            <h2 className="section-title">Answers, upfront.</h2>
          </FadeIn>

          <FadeIn>
            <div className="border-t border-midnight-900/10">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group border-b border-midnight-900/10">
                  <summary className="flex items-center justify-between gap-6 py-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-semibold text-midnight-900 text-lg tracking-tight">{faq.q}</span>
                    <Plus
                      size={20}
                      weight="bold"
                      className="text-gold-600 shrink-0 transition-transform duration-300 group-open:rotate-45"
                    />
                  </summary>
                  <p className="pb-6 text-midnight-900/60 font-light leading-relaxed max-w-2xl">{faq.a}</p>
                </details>
              ))}
            </div>
            <p className="text-center mt-10 text-sm text-midnight-900/50 font-light">
              More questions?{" "}
              <Link href="/help" className="font-semibold text-midnight-800 hover:text-gold-600 transition-colors">
                Visit the Help Center →
              </Link>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ===== Contact strip ===== */}
      <section className="bg-midnight-900 text-ivory-50 py-20 border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-12">
            <p className="eyebrow-dark mb-4">
              <span className="eyebrow-rule" />
              Reach us directly
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">One message away, always.</h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden">
            <FadeIn className="h-full">
              <div className="bg-midnight-900 p-8 h-full">
                <ChatCircleText size={26} weight="light" className="text-gold-300 mb-5" />
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ivory-50/40 mb-4">WhatsApp</div>
                <div className="space-y-2">
                  {WHATSAPP_NUMBERS.map((n) => (
                    <a
                      key={n}
                      href={`https://wa.me/${n.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-ivory-50/80 hover:text-gold-300 text-sm font-mono transition-colors"
                    >
                      {n}
                    </a>
                  ))}
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.08} className="h-full">
              <div className="bg-midnight-900 p-8 h-full">
                <PaperPlaneTilt size={26} weight="light" className="text-gold-300 mb-5" />
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ivory-50/40 mb-4">Telegram</div>
                <a
                  href="https://t.me/Vertexinternational1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ivory-50/80 hover:text-gold-300 text-sm font-mono transition-colors"
                >
                  @Vertexinternational1
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.16} className="h-full">
              <div className="bg-midnight-900 p-8 h-full">
                <EnvelopeSimple size={26} weight="light" className="text-gold-300 mb-5" />
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ivory-50/40 mb-4">Email</div>
                <a
                  href="mailto:vertex@vertexintern.com"
                  className="text-ivory-50/80 hover:text-gold-300 text-sm font-mono transition-colors"
                >
                  vertex@vertexintern.com
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative bg-midnight-950 text-ivory-50 py-28 md:py-36 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-midnight-600/20 blur-[130px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <FadeIn>
            <p className="eyebrow-dark mb-6 justify-center">
              <span className="eyebrow-rule" />
              Begin today
            </p>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] mb-8">
              Ready to start
              <br />
              your journey?
            </h2>
            <p className="text-ivory-50/50 text-lg font-light mb-12 max-w-xl mx-auto">
              Register today and let Vertex International connect you with opportunities across the globe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="btn-gold px-9 py-4">
                Create Free Account
              </Link>
              <Link href="/contact" className="btn-ghost-dark px-9 py-4">
                Contact Us
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
