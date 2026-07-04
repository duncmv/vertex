import type { Metadata } from "next";
import Link from "next/link";
import TestimonialsLogos from "@/components/TestimonialsLogos";
import { Handshake, Star, GlobeHemisphereEast, Heart, ArrowRight } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Vertex International Recruitment — our mission, values, and the team behind your global career journey.",
};

const VALUES = [
  { icon: Handshake, title: "Integrity", description: "We operate with transparency and honesty in every interaction." },
  { icon: Star, title: "Excellence", description: "We set the highest standards for recruitment outcomes." },
  { icon: GlobeHemisphereEast, title: "Global Reach", description: "Our network spans 30+ countries, opening doors worldwide." },
  { icon: Heart, title: "Candidate First", description: "We prioritize your career growth at every step." },
];

const MILESTONES = [
  { value: "2015", label: "Founded" },
  { value: "5,000+", label: "Placements" },
  { value: "120+", label: "Partners" },
  { value: "30+", label: "Countries" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-midnight-950 text-ivory-50 py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="eyebrow-dark mb-6">
            <span className="eyebrow-rule" />
            About Vertex International
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] max-w-3xl mb-8">
            Bridging talent with world-class opportunity.
          </h1>
          <p className="text-ivory-50/55 text-lg font-light max-w-2xl leading-relaxed">
            A premier international recruitment agency dedicated to connecting talented professionals
            with employers across the globe.
          </p>
        </div>
      </section>

      {/* Mission + milestones */}
      <section className="py-24 md:py-32 bg-ivory-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="eyebrow mb-5">
                <span className="eyebrow-rule" />
                Our mission
              </p>
              <h2 className="section-title mb-6">Empowering careers, enabling growth.</h2>
              <p className="text-midnight-900/60 font-light leading-relaxed mb-4">
                Founded with a vision to transform international recruitment, Vertex International has been placing
                qualified professionals in roles that match their skills and aspirations across Africa, the Middle East,
                Europe, and beyond.
              </p>
              <p className="text-midnight-900/60 font-light leading-relaxed mb-10">
                We believe every professional deserves the opportunity to reach their full potential, regardless of borders.
                Our dedicated team works tirelessly to ensure candidates and employers find their perfect match.
              </p>
              <Link href="/jobs" className="btn-primary">
                Browse Opportunities <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
            <div className="grid grid-cols-2 border-t border-l border-midnight-900/10">
              {MILESTONES.map((stat) => (
                <div key={stat.label} className="border-b border-r border-midnight-900/10 p-8 md:p-10">
                  <div className="text-3xl md:text-4xl font-semibold tracking-tight text-midnight-900">{stat.value}</div>
                  <div className="text-midnight-900/45 text-[11px] uppercase tracking-[0.2em] mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 md:py-32 bg-ivory-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow mb-5">
              <span className="eyebrow-rule" />
              What guides us
            </p>
            <h2 className="section-title">Our core values.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="bg-white border border-midnight-900/10 rounded-2xl p-8 hover:border-gold-500/60 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full border border-midnight-900/15 flex items-center justify-center text-midnight-800 mb-6">
                    <Icon size={22} weight="regular" />
                  </div>
                  <h3 className="font-semibold text-midnight-900 text-lg mb-2 tracking-tight">{v.title}</h3>
                  <p className="text-midnight-900/55 text-sm font-light leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <TestimonialsLogos />

      {/* CTA */}
      <section className="bg-midnight-950 py-24 md:py-28 text-ivory-50 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-6">Ready to find your next role?</h2>
          <p className="text-ivory-50/50 font-light mb-10">
            Join thousands of professionals who found their dream jobs with Vertex International.
          </p>
          <Link href="/auth/register" className="btn-gold px-9 py-4">
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}
