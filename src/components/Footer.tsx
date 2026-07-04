import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

const FOOTER_LINKS = {
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/help", label: "Help Center" },
  ],
  "For Candidates": [
    { href: "/jobs", label: "Browse Jobs" },
    { href: "/apply", label: "Apply Now" },
    { href: "/auth/register", label: "Create Account" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-midnight-950 text-ivory-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top CTA row */}
        <div className="py-16 border-b border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <p className="eyebrow-dark mb-5">
              <span className="eyebrow-rule" />
              Vertex International
            </p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05] max-w-xl">
              Your next chapter starts abroad.
            </h2>
          </div>
          <Link
            href="/auth/register"
            className="group inline-flex items-center gap-3 text-gold-300 hover:text-gold-400 text-sm font-semibold uppercase tracking-[0.2em] transition-colors shrink-0"
          >
            Create your profile
            <ArrowUpRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </div>

        {/* Links */}
        <div className="py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.svg" alt="Vertex" className="h-8 w-auto brightness-0 invert opacity-90" />
              <span className="text-gold-400 font-medium text-[9px] tracking-[0.35em] uppercase leading-none">
                International
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ivory-50/50 font-light max-w-xs">
              Connecting talented professionals with world-class employers across Africa, the Middle East, and Europe.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ivory-50/40 mb-5">{group}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ivory-50/70 hover:text-ivory-50 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant wordmark */}
        <div className="border-t border-white/10 pt-10 pb-4 overflow-hidden select-none" aria-hidden="true">
          <p className="text-[16vw] md:text-[12vw] leading-[0.85] font-bold tracking-tight text-white/[0.04] whitespace-nowrap text-center">
            VERTEX
          </p>
        </div>

        {/* Bottom bar */}
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
          <p className="text-xs tracking-wide text-ivory-50/40">
            © {new Date().getFullYear()} Vertex International Recruitment. All rights reserved.
          </p>
          <a
            href="mailto:vertex@vertexintern.com"
            className="text-xs tracking-wide text-ivory-50/40 hover:text-ivory-50 transition-colors"
          >
            vertex@vertexintern.com
          </a>
        </div>
      </div>
    </footer>
  );
}
