"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/jobs", label: "Jobs" },
  { href: "/apply", label: "Apply" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const handleTranslate = (lang: string) => {
    if (lang === 'en') {
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
    } else {
        document.cookie = `googtrans=/en/${lang}; path=/;`;
        document.cookie = `googtrans=/en/${lang}; path=/; domain=${window.location.hostname}`;
    }
    window.location.reload();
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white shadow-sm"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 md:h-24 transition-all duration-300">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Vertex" className="h-[42px] md:h-[48px] w-auto transition-all drop-shadow-sm" />
            <div className="hidden sm:flex flex-col justify-center translate-y-0.5">
              <span className="text-[#104F36] font-black text-[22px] leading-none tracking-wide">
                VERTEX
              </span>
              <span className="text-amber-500 font-extrabold text-[9px] leading-none tracking-[0.25em] uppercase mt-1">
                INTERNATIONAL
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[15px] xl:text-[16px] font-bold tracking-wide transition-all duration-300 relative group uppercase ${
                  pathname === link.href
                    ? "text-[#104F36]"
                    : "text-slate-500 hover:text-[#104F36]"
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-2 left-0 w-full h-[3px] bg-amber-400 rounded-full origin-left transition-transform duration-300 ${
                  pathname === link.href ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                }`} />
              </Link>
            ))}
          </div>

          {/* Auth buttons & Lang Menu */}
          <div className="hidden md:flex items-center gap-4">
            {/* Lang Dropdown */}
            <div className="relative group py-2 pl-2 md:pl-0 lg:pl-2">
               <div className="flex items-center gap-1.5 text-[14px] font-bold text-slate-500 hover:text-[#104F36] cursor-pointer uppercase tracking-wide">
                  <span>🌍 EN</span>
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
               </div>
               <div className="absolute top-full right-0 mt-0 bg-white border border-slate-100 shadow-xl rounded-xl py-2 w-36 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right group-hover:translate-y-0 translate-y-2 flex flex-col z-50">
                  <button onClick={() => handleTranslate('it')} className="text-left px-4 py-2 hover:bg-emerald-50 hover:text-[#104F36] text-sm font-semibold text-slate-700 transition-colors cursor-pointer">🇮🇹 Italian</button>
                  <button onClick={() => handleTranslate('fr')} className="text-left px-4 py-2 hover:bg-emerald-50 hover:text-[#104F36] text-sm font-semibold text-slate-700 transition-colors cursor-pointer">🇫🇷 French</button>
                  <button onClick={() => handleTranslate('pt')} className="text-left px-4 py-2 hover:bg-emerald-50 hover:text-[#104F36] text-sm font-semibold text-slate-700 transition-colors cursor-pointer">🇵🇹 Portuguese</button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button onClick={() => handleTranslate('en')} className="text-left px-4 py-2 hover:bg-emerald-50 hover:text-[#1CA36A] text-sm font-black text-[#1CA36A] transition-colors flex items-center justify-between cursor-pointer">
                     🇬🇧 English
                     <span className="text-[12px]">✓</span>
                  </button>
               </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block"></div>

            <Link href="/auth/login" className="text-[15px] font-bold tracking-wide text-slate-500 hover:text-[#104F36] transition-colors uppercase">
              Log In
            </Link>
            <Link href="/auth/register" className="bg-[#104F36] hover:bg-emerald-900 text-white font-bold text-[14px] py-3 px-6 lg:px-8 rounded-full shadow-[0_8px_20px_rgba(16,79,54,0.25)] hover:shadow-[0_12px_25px_rgba(16,79,54,0.35)] transition-all uppercase tracking-wider transform hover:scale-105 active:scale-95">
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-button"
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <div className="w-5 flex flex-col gap-1">
              <span className={`block h-0.5 bg-current transition-all ${open ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block h-0.5 bg-current transition-all ${open ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 bg-current transition-all ${open ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 border-t border-slate-100 mt-1">
            <div className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-slate-100" />
              
              <div className="px-4 py-1 pb-3 flex items-center gap-2">
                 <button onClick={() => handleTranslate('en')} className="px-3 py-1.5 bg-[#104F36] text-white text-xs font-bold rounded-md">EN</button>
                 <button onClick={() => handleTranslate('it')} className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 text-xs font-bold rounded-md transition-colors">IT</button>
                 <button onClick={() => handleTranslate('fr')} className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 text-xs font-bold rounded-md transition-colors">FR</button>
                 <button onClick={() => handleTranslate('pt')} className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 text-xs font-bold rounded-md transition-colors">PT</button>
              </div>

              <hr className="my-1 border-slate-100" />
              <Link href="/auth/login" className="px-4 py-2.5 text-sm font-medium text-slate-600">Log In</Link>
              <Link href="/auth/register" className="btn-primary text-sm mx-2">Get Started</Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
