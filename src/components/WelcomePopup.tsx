"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { isInternalPortalPath } from "@/lib/rbac";

export default function WelcomePopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if the user has already accepted the terms in this browser
    const hasAccepted = localStorage.getItem("vertex_welcome_accepted");
    if (!hasAccepted) {
      // Small delay so it feels like a deliberate popup after initial page load
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("vertex_welcome_accepted", "true");
    setIsOpen(false);
  };

  // Don't render anything during SSR to prevent hydration mismatch
  if (!isMounted || isInternalPortalPath(pathname)) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-100"
          >
            <div className="p-8 sm:p-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
                Welcome to Vertex International
              </h2>
              
              <p className="text-slate-600 mb-8 leading-relaxed text-sm sm:text-base">
                You are entering the official online portal for Vertex International Recruitment. 
                By continuing to use this website, you acknowledge that you have read and agree to our{" "}
                <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 hover:underline font-semibold outline-none focus:ring-2 focus:ring-emerald-500 rounded" onClick={() => setIsOpen(false)}>
                  Privacy Policy
                </Link>
                {" "}and{" "}
                <Link href="/terms" className="text-emerald-600 hover:text-emerald-700 hover:underline font-semibold outline-none focus:ring-2 focus:ring-emerald-500 rounded" onClick={() => setIsOpen(false)}>
                  Terms of Service
                </Link>.
              </p>
              
              <button 
                onClick={handleAccept}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600"
              >
                Accept & Enter Portal
              </button>
            </div>
            
            <div className="bg-slate-50 py-3 text-center border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                We are committed to your privacy
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
