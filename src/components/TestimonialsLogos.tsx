"use client";

import { motion } from "framer-motion";

const COMPANIES = [
  { name: "Global Build", logo: "🏗️" },
  { name: "CarePlus Med", logo: "🏥" },
  { name: "TechManufacture", logo: "🏭" },
  { name: "AeroWorks", logo: "🛫" },
  { name: "Prime Logistics", logo: "📦" },
  { name: "ConstructPro", logo: "🚧" },
];

const TESTIMONIALS = [
  { text: "Vertex International helped me find my dream job abroad. The entire process from application to relocation was incredibly smooth and professional.", author: "Abebe B.", role: "Maintenance Technician" },
  { text: "Thanks to Vertex, I am now working in a top-tier facility in the Middle East. I highly recommend their services to anyone looking for global opportunities!", author: "Sara T.", role: "Machine Operator" },
  { text: "The team is exceptionally supportive. They guided me through every step of the visa processing and made sure I was settled in properly.", author: "Dawit M.", role: "Civil Engineer" },
];

export default function TestimonialsLogos() {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center mb-12">
          <h2 className="section-title">Trusted By Global Companies</h2>
          <p className="section-subtitle mx-auto">We partner with industry leaders across the world</p>
        </div>
        
        {/* Infinite Logo Slider */}
        <div className="relative flex overflow-hidden mask-image-m-fade">
          <motion.div
            className="flex items-center space-x-16 md:space-x-32 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              ease: "linear",
              duration: 30,
              repeat: Infinity,
            }}
          >
            {[...COMPANIES, ...COMPANIES, ...COMPANIES, ...COMPANIES].map((company, i) => (
              <div key={i} className="flex flex-col items-center justify-center shrink-0 w-32 opacity-70 hover:opacity-100 transition-opacity">
                <span className="text-6xl mb-4 grayscale filter">{company.logo}</span>
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">{company.name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-3xl py-16 px-4">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Success Stories</h2>
            <p className="section-subtitle mx-auto">Hear from professionals we've placed globally</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
                <div className="text-amber-400 mb-4 text-xl">
                  {"★".repeat(5)}
                </div>
                <p className="text-slate-600 italic mb-6 leading-relaxed">"{t.text}"</p>
                <div>
                  <div className="font-bold text-slate-800">{t.author}</div>
                  <div className="text-sm text-emerald-700">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
