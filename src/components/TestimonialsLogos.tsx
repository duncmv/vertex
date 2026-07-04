"use client";

import { motion } from "framer-motion";

const COMPANIES = [
  "Global Build",
  "CarePlus Med",
  "TechManufacture",
  "AeroWorks",
  "Prime Logistics",
  "ConstructPro",
];

const TESTIMONIALS = [
  { text: "Vertex International helped me find my dream job abroad. The entire process from application to relocation was incredibly smooth and professional.", author: "Abebe B.", role: "Maintenance Technician" },
  { text: "Thanks to Vertex, I am now working in a top-tier facility in the Middle East. I highly recommend their services to anyone looking for global opportunities!", author: "Sara T.", role: "Machine Operator" },
  { text: "The team is exceptionally supportive. They guided me through every step of the visa processing and made sure I was settled in properly.", author: "Dawit M.", role: "Civil Engineer" },
];

export default function TestimonialsLogos() {
  return (
    <section className="py-24 bg-ivory-50 overflow-hidden">
      {/* Partner wordmark marquee */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <p className="eyebrow justify-center w-full text-center mb-10">
          <span className="eyebrow-rule" />
          Trusted by global companies
        </p>

        <div className="relative flex overflow-hidden marquee-mask">
          <motion.div
            className="flex items-center w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 30, repeat: Infinity }}
          >
            {[...COMPANIES, ...COMPANIES, ...COMPANIES, ...COMPANIES].map((company, i) => (
              <span
                key={i}
                className="shrink-0 px-10 md:px-14 text-lg md:text-xl font-semibold tracking-[0.15em] uppercase text-midnight-900/30 hover:text-midnight-900/60 transition-colors whitespace-nowrap"
              >
                {company}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <p className="eyebrow mb-5">
            <span className="eyebrow-rule" />
            Success stories
          </p>
          <h2 className="section-title">Placed. Settled. Thriving.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={i}
              className="flex flex-col justify-between bg-white border border-midnight-900/10 rounded-2xl p-8 hover:border-gold-500/60 transition-colors"
            >
              <blockquote className="text-midnight-900/70 font-light leading-relaxed mb-8">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption>
                <div className="w-8 h-px bg-gold-500 mb-4" />
                <div className="font-semibold text-midnight-900">{t.author}</div>
                <div className="text-sm text-midnight-900/50 font-light mt-0.5">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
