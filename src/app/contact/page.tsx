"use client";

import { useState } from "react";
import type { Metadata } from "next";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    // For now, simulate success (API route can be added later)
    await new Promise((r) => setTimeout(r, 800));
    setStatus("success");
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-950 to-emerald-800 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black mb-2">Contact Us</h1>
          <p className="text-emerald-200">We&apos;d love to hear from you</p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Get In Touch</h2>
              <div className="space-y-6">
                {/* WhatsApp Numbers */}
                <div className="flex gap-4">
                  <div className="text-2xl">💬</div>
                  <div>
                    <h3 className="font-semibold text-slate-800">WhatsApp</h3>
                    <div className="space-y-1 mt-1">
                      {["+44 7440 167608", "+44 7438 299563", "+44 7405 368405", "+44 7438 613251"].map((n) => (
                        <a key={n} href={`https://wa.me/${n.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="block text-emerald-700 hover:underline text-sm font-mono">{n}</a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Telegram */}
                <div className="flex gap-4">
                  <div className="text-2xl">✈️</div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Telegram</h3>
                    <a href="https://t.me/Vertexinternational1" target="_blank" rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline text-sm font-mono mt-0.5 block">@Vertexinternational1</a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4">
                  <div className="text-2xl">📧</div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Email</h3>
                    <a href="mailto:vertex@vertexintern.com" className="text-emerald-700 hover:underline text-sm font-mono mt-0.5 block">vertex@vertexintern.com</a>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex gap-4">
                  <div className="text-2xl">🕒</div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Response Time</h3>
                    <p className="text-slate-500 text-sm mt-0.5">WhatsApp messages answered within a few hours. Email responses within 1–2 business days.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Form */}
            <div className="card p-8">
              {status === "success" ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="font-bold text-slate-800 text-xl mb-2">Message Sent!</h3>
                  <p className="text-slate-500 mb-6">Thank you for reaching out. We&apos;ll respond within 1–2 business days.</p>
                  <button onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", message: "" }); }} className="btn-primary text-sm">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-800 mb-5">Send a Message</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                      <input id="contact-name" name="name" value={form.name} onChange={handleChange} required className="input-field" placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                      <input id="contact-email" name="email" type="email" value={form.email} onChange={handleChange} required className="input-field" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject *</label>
                    <input id="contact-subject" name="subject" value={form.subject} onChange={handleChange} required className="input-field" placeholder="How can we help?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Message *</label>
                    <textarea id="contact-message" name="message" value={form.message} onChange={handleChange} required rows={5} className="input-field resize-none" placeholder="Your message..." />
                  </div>
                  {error && <div className="text-red-600 text-sm">{error}</div>}
                  <button type="submit" id="contact-submit-btn" disabled={status === "loading"} className="btn-primary w-full py-3.5 text-base disabled:opacity-60">
                    {status === "loading" ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
