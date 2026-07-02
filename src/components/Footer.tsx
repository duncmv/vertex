import Link from "next/link";

const FOOTER_LINKS = {
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
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
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-end gap-2 mb-6">
              <img src="/logo.svg" alt="Vertex" className="h-[38px] w-auto brightness-0 invert opacity-90" />
              <span className="text-amber-400 font-semibold text-[10px] tracking-widest uppercase leading-none mb-[6px] -ml-1.5">
                INTERNATIONAL
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Connecting talented professionals with world-class employers across Africa, the Middle East, and beyond.
            </p>
            <div className="flex gap-3 mt-5">
              {/* Social icons (placeholder links) */}
              {["Linkedin", "Twitter", "Facebook"].map((social) => (
                <a
                  key={social}
                  href="#"
                  aria-label={social}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-emerald-600 flex items-center justify-center transition-colors"
                >
                  <span className="text-xs font-bold text-slate-400 hover:text-white leading-none">
                    {social[0]}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{group}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Vertex International Recruitment. All rights reserved.
          </p>
          <p className="text-sm text-slate-500">
            📧{" "}
            <a href="mailto:info@vertexinternational.com" className="hover:text-white transition-colors">
              info@vertexinternational.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
