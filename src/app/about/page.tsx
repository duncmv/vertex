import type { Metadata } from "next";
import Link from "next/link";
import TestimonialsLogos from "@/components/TestimonialsLogos";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Vertex International Recruitment — our mission, values, and the team behind your global career journey.",
};

const VALUES = [
  { icon: "🤝", title: "Integrity", description: "We operate with transparency and honesty in every interaction." },
  { icon: "⭐", title: "Excellence", description: "We set the highest standards for recruitment outcomes." },
  { icon: "🌐", title: "Global Reach", description: "Our network spans 30+ countries, opening doors worldwide." },
  { icon: "❤️", title: "Candidate First", description: "We prioritize your career growth at every step." },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-950 to-emerald-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">About Vertex International</h1>
          <p className="text-emerald-200 text-lg max-w-2xl mx-auto leading-relaxed">
            A premier international recruitment agency dedicated to bridging talented professionals with world-class opportunities across the globe.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-amber-500 font-semibold text-sm uppercase tracking-widest">Our Mission</span>
              <h2 className="section-title mt-2 mb-5">Empowering Careers, Enabling Growth</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Founded with a vision to transform international recruitment, Vertex International has been placing
                qualified professionals in roles that match their skills and aspirations across Africa, the Middle East,
                Europe, and beyond.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                We believe every professional deserves the opportunity to reach their full potential, regardless of borders.
                Our dedicated team works tirelessly to ensure candidates and employers find their perfect match.
              </p>
              <Link href="/jobs" className="btn-primary">
                Browse Career Opportunities
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "2015", label: "Founded" },
                { value: "5,000+", label: "Placements" },
                { value: "120+", label: "Partners" },
                { value: "30+", label: "Countries" },
              ].map((stat) => (
                <div key={stat.label} className="card p-6 text-center">
                  <div className="text-3xl font-black text-emerald-800">{stat.value}</div>
                  <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="card p-6">
                <div className="text-3xl mb-4">{v.icon}</div>
                <h3 className="font-bold text-slate-800 text-lg mb-2">{v.title}</h3>
                <p className="text-slate-500 text-sm">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsLogos />

      {/* CTA */}
      <section className="bg-emerald-800 py-16 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-black mb-4">Ready to Find Your Next Role?</h2>
          <p className="text-emerald-200 mb-8">Join thousands of professionals who found their dream jobs with Vertex International.</p>
          <Link href="/auth/register" className="btn-gold px-8 py-3.5 text-base">
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}
