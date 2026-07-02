"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HomeClientProps {
  jobs: any[];
  stats: { value: string; label: string }[];
  categories: any[];
  benefits: any[];
  requirements: any[];
}

export default function HomeClient({ jobs, stats, categories, benefits, requirements }: HomeClientProps) {
  return (
    <div className="overflow-x-hidden">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden min-h-[95vh] flex items-center bg-[#072F20] text-white">
        {/* Sleek abstract luxury background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base gradient map */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-800/40 via-[#072F20] to-[#041A11]" />
          
          {/* Subtle grid pattern for modern touch */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* Animated luxury glow orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.4, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-emerald-500/10 blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[100px]" 
          />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-48 w-full">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
            
            {/* TEXT COLUMN (LEFT) */}
            <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0 order-1 lg:order-1 z-10 relative">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold tracking-[0.15em] text-emerald-300 uppercase mb-8 shadow-2xl shadow-emerald-900/50"
              >
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                Now Hiring Across 30+ Countries
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="text-[2.75rem] sm:text-6xl md:text-[4.5rem] lg:text-[5.5rem] font-black leading-[1.05] mb-8 tracking-tight"
              >
                Your Gateway to <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 drop-shadow-sm">
                  Global Careers
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                className="text-lg md:text-xl text-emerald-50/80 leading-relaxed mb-12 max-w-xl md:mx-0 mx-auto font-light tracking-wide lg:mx-0"
              >
                Vertex International Recruitment bridges the gap between talented professionals and world-class employers
                across Africa, the Middle East, and Europe.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start"
              >
                <Link href="/jobs" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-extrabold text-[15px] sm:text-lg px-8 py-4 rounded-full shadow-[0_10px_40px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                  Browse Open Jobs <span className="text-xl leading-none">→</span>
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 border-2 border-white/20 text-white font-bold text-[15px] sm:text-lg px-8 py-4 rounded-full transition-all duration-300 hover:border-white/40 uppercase tracking-wide"
                >
                  Learn About Us
                </Link>
              </motion.div>
            </div>

            {/* IMAGE COLUMN (RIGHT) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className="relative flex justify-center lg:justify-start order-2 lg:order-2 h-full w-full mt-10 lg:mt-0"
            >
               <div className="relative w-full max-w-[400px] lg:max-w-[550px] mx-auto xl:mx-0 xl:mr-auto">
                 {/* Decorative elements around image */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] lg:w-[120%] h-[110%] lg:h-[120%] bg-emerald-500/10 blur-[60px] lg:blur-[80px] rounded-full pointer-events-none" />
                 <motion.div 
                    animate={{ y: [0, -10, 0] }} 
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10"
                 >
                   <img 
                     src="/hero-handshake.png" 
                     alt="Vertex Recruitment Partnership" 
                     className="w-full lg:w-[120%] lg:max-w-[650px] lg:ml-4 h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] lg:drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]"
                   />
                 </motion.div>
                 
                 {/* Trust Badge Overlay */}
                 <motion.div 
                   initial={{ opacity: 0, y: 30 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.8, duration: 0.8 }}
                   className="absolute -bottom-6 lg:bottom-4 left-0 lg:-left-8 bg-white/10 backdrop-blur-xl border border-white/20 p-3 lg:p-4 rounded-2xl shadow-2xl flex items-center gap-3 lg:gap-4 z-20 w-max pr-6 lg:pr-8 border-l-[4px] border-l-amber-400"
                 >
                    <div className="bg-amber-400 p-2 lg:p-3 rounded-full text-[#072F20] shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                       <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                    </div>
                    <div>
                       <p className="text-white font-black text-sm lg:text-[15px] leading-tight tracking-wide">Official Partner</p>
                       <p className="text-emerald-300 text-xs lg:text-sm font-bold tracking-wider">HUNGARY & EU SECTOR</p>
                    </div>
                 </motion.div>
               </div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 1.5, duration: 1 }}
           className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
           <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-400/70">Scroll Down</span>
           <div className="w-[1px] h-12 bg-gradient-to-b from-emerald-400/70 to-transparent" />
        </motion.div>
      </section>

      {/* ===== Stats ===== */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, idx) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-black text-emerald-800">{stat.value}</div>
                <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Job Categories ===== */}
      <section className="bg-slate-50 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="section-title">Job Categories</h2>
            <p className="section-subtitle mx-auto">
              Vertex International actively recruits for unskilled, semi-skilled, and engineering graduate roles abroad.
            </p>
          </motion.div>

          <div 
            className="relative flex overflow-hidden py-4 -mx-4 px-4"
            style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
          >
            <motion.div
              className="flex items-stretch gap-6 w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                ease: "linear",
                duration: 45,
                repeat: Infinity,
              }}
              whileHover={{ animationPlayState: "paused" }}
            >
              {[...categories, ...categories, ...categories, ...categories].map((cat, idx) => (
                <div key={`${cat.title}-${idx}`} className="w-[300px] shrink-0">
                  <TiltCard idx={idx} disableEntryAnimation={true}>
                    <div className="text-4xl mb-3">{cat.icon}</div>
                    <h3 className="font-bold text-slate-800 text-base mb-2 group-hover:text-emerald-700 transition-colors">{cat.title}</h3>
                    <p className="text-xs text-amber-600 font-semibold mb-3">{cat.industries}</p>
                    <ul className="space-y-1">
                      {cat.roles.map((role: string) => (
                        <li key={role} className="text-slate-500 text-xs flex text-left items-start gap-1.5 whitespace-normal">
                          <span className="w-1.5 h-1.5 mt-1 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="leading-tight">{role}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <Link href="/jobs" className="text-xs font-semibold text-emerald-700 hover:underline">Browse {cat.title} →</Link>
                    </div>
                  </TiltCard>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== Featured Jobs ===== */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title">Featured Opportunities</h2>
              <p className="text-slate-500 mt-2">Explore our latest open positions</p>
            </motion.div>
            <Link href="/jobs" className="btn-secondary text-sm py-2.5 px-5">
              View All Jobs →
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">💼</div>
              <p>No jobs available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job: any, idx: number) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                >
                  <Link href={`/jobs/${job.id}`} className="card p-6 block group h-full">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors leading-snug">
                        {job.title}
                      </h3>
                      <span className="badge-active flex-shrink-0">Active</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      <span>📍 {job.city}, {job.country}</span>
                    </div>
                    {job.salary_range && (
                      <div className="text-sm font-semibold text-green-700">💰 {job.salary_range}</div>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="text-sm font-medium text-emerald-700 group-hover:underline">Apply →</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Package & Benefits ===== */}
      <section className="bg-emerald-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Package &amp; Benefits</h2>
            <p className="text-emerald-300">What you get when placed through Vertex International</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((b, idx) => (
              <motion.div 
                key={b.label} 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", damping: 12, delay: idx * 0.1 }}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/20 transition-all"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{b.icon}</div>
                <div className="text-amber-400 font-black text-sm uppercase tracking-wider mb-1">{b.label}</div>
                <div className="text-white font-semibold text-sm leading-snug">{b.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Eligibility & Requirements ===== */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="section-title">Eligibility &amp; Requirements</h2>
            <p className="section-subtitle mx-auto">Make sure you meet these requirements before applying.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.map((req, idx) => (
              <motion.div 
                key={req.text} 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
              >
                <span className="text-2xl flex-shrink-0">{req.icon}</span>
                <span className="text-slate-700 text-sm font-medium">{req.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact Strip ===== */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-1">Reach Us Directly</h2>
            <p className="text-slate-400 text-sm">We&apos;re available via WhatsApp, Telegram, and Email</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="text-3xl mb-3">💬</div>
              <div className="font-bold text-white mb-2">WhatsApp</div>
              <div className="space-y-1">
                {["+44 7440 167608", "+44 7438 299563", "+44 7405 368405", "+44 7438 613251"].map((n) => (
                  <a key={n} href={`https://wa.me/${n.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="block text-emerald-400 hover:text-emerald-300 text-sm font-mono transition-colors">
                    {n}
                  </a>
                ))}
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="text-3xl mb-3">✈️</div>
              <div className="font-bold text-white mb-2">Telegram</div>
              <a href="https://t.me/Vertexinternational1" target="_blank" rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-mono transition-colors">@Vertexinternational1</a>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="text-3xl mb-3">📧</div>
              <div className="font-bold text-white mb-2">Email</div>
              <a href="mailto:vertex@vertexintern.com"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-mono transition-colors">vertex@vertexintern.com</a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to Start Your Journey?</h2>
            <p className="text-emerald-200 text-lg mb-8">
              Register today and let Vertex International connect you with opportunities across the globe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="btn-gold px-8 py-3.5 text-base shadow-xl shadow-amber-900/20">
                Create Free Account
              </Link>
              <Link href="/contact" className="btn-secondary border-white/40 text-white hover:bg-white/10 px-8 py-3.5 text-base">
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function TiltCard({ children, idx, disableEntryAnimation = false }: { children: React.ReactNode, idx: number, disableEntryAnimation?: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const InnerCard = (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="card p-6 flex flex-col hover:border-emerald-400 hover:shadow-2xl transition-shadow group h-full bg-white relative overflow-hidden"
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative z-10" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </motion.div>
  );

  if (disableEntryAnimation) {
    return <div style={{ perspective: 1000, height: '100%' }}>{InnerCard}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: idx * 0.1 }}
      style={{ perspective: 1000, height: '100%' }}
    >
      {InnerCard}
    </motion.div>
  );
}
