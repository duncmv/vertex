"use client";

import { useState, useEffect } from "react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>({ ai_enabled: "true", whatsapp_number: "" });
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbCategory, setNewKbCategory] = useState("General");
  const [newKbContent, setNewKbContent] = useState("");

  const [editEmailEvent, setEditEmailEvent] = useState("");
  const [editEmailSubject, setEditEmailSubject] = useState("");
  const [editEmailBody, setEditEmailBody] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(s => setSettings(s)).catch(() => {});
    fetch("/api/admin/knowledge").then(r => r.json()).then(k => setKnowledge(Array.isArray(k) ? k : [])).catch(() => {});
    fetch("/api/admin/emails").then(r => r.json()).then(e => setEmails(Array.isArray(e) ? e : [])).catch(() => {});
  }, []);

  const saveSettings = async () => {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    if (res.ok) alert("Global settings updated.");
  };

  const addKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newKbTitle, category: newKbCategory, content: newKbContent })
    });
    if (res.ok) {
      const added = await res.json();
      setKnowledge([...knowledge, added]);
      setNewKbTitle(""); setNewKbContent("");
    }
  };

  const deleteKnowledge = async (id: string) => {
    if (!confirm("Delete article?")) return;
    const res = await fetch(`/api/admin/knowledge?id=${id}`, { method: "DELETE" });
    if (res.ok) setKnowledge(knowledge.filter(k => k.id !== id));
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/emails", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: editEmailEvent, subject: editEmailSubject, body_html: editEmailBody })
    });
    if (res.ok) {
      const updated = await res.json();
      setEmails(prev => {
        const idx = prev.findIndex(p => p.event === updated.event);
        if (idx > -1) { prev[idx] = updated; return [...prev]; }
        return [...prev, updated];
      });
      setEditEmailEvent("");
      alert("Email template saved.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Settings */}
      <div className="card p-6">
        <h2 className="font-semibold text-midnight-900 mb-4">Global Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-midnight-900/70 mb-2">Enable AI Chat Assistant</label>
            <select
              value={settings.ai_enabled || "true"}
              onChange={e => setSettings({ ...settings, ai_enabled: e.target.value })}
              className="input-field"
            >
              <option value="true">Enabled (Online)</option>
              <option value="false">Disabled (Offline)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-midnight-900/70 mb-2">WhatsApp Contact Number</label>
            <input
              type="text"
              placeholder="+1234567890"
              value={settings.whatsapp_number || ""}
              onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
        <button onClick={saveSettings} className="btn-primary mt-4 py-2.5 px-6 text-xs">Save Global Settings</button>
      </div>

      {/* Knowledge Base */}
      <div className="card p-6">
        <h2 className="font-semibold text-midnight-900 mb-4">Knowledge Base Articles</h2>
        <p className="text-sm text-midnight-900/50 mb-6">These articles are displayed in the Help Center and configure the AI Assistant's knowledge.</p>

        <form onSubmit={addKnowledge} className="bg-ivory-100 p-4 rounded-xl border border-midnight-900/10 mb-6 space-y-4">
          <h3 className="font-semibold text-midnight-900 text-sm">Add New Instruction / FAQ</h3>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Article Title (e.g. How to pay?)" value={newKbTitle} onChange={e => setNewKbTitle(e.target.value)} className="input-field" />
            <input required placeholder="Category (e.g. Payments)" value={newKbCategory} onChange={e => setNewKbCategory(e.target.value)} className="input-field" />
          </div>
          <textarea required placeholder="Write the comprehensive answer or policy here..." value={newKbContent} onChange={e => setNewKbContent(e.target.value)} rows={4} className="input-field resize-y" />
          <button type="submit" className="btn-primary py-2.5 px-6 text-xs">Add Article</button>
        </form>

        <div className="space-y-3">
          {knowledge.map(k => (
            <div key={k.id} className="flex items-center justify-between p-4 bg-white border border-midnight-900/10 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-gold-600 bg-gold-300/15 px-2 py-1 rounded mr-3">{k.category}</span>
                <span className="font-medium text-midnight-900">{k.title}</span>
              </div>
              <button onClick={() => deleteKnowledge(k.id)} className="text-red-500 text-sm hover:underline">Delete</button>
            </div>
          ))}
          {knowledge.length === 0 && <div className="text-midnight-900/40 text-sm">No articles added yet.</div>}
        </div>
      </div>

      {/* Emails */}
      <div className="card p-6">
        <h2 className="font-semibold text-midnight-900 mb-4">Automated Email Templates</h2>
        <p className="text-sm text-midnight-900/50 mb-6">Override the default HTML emails sent to candidates. Select an event ID to override.</p>

        <form onSubmit={saveEmail} className="bg-ivory-100 p-4 rounded-xl border border-midnight-900/10 mb-6 space-y-4">
          <h3 className="font-semibold text-midnight-900 text-sm">Edit Template</h3>
          <select required value={editEmailEvent} onChange={e => {
            const ev = e.target.value;
            setEditEmailEvent(ev);
            const existing = emails.find(em => em.event === ev);
            if (existing) {
              setEditEmailSubject(existing.subject);
              setEditEmailBody(existing.body_html);
            } else {
              setEditEmailSubject(""); setEditEmailBody("");
            }
          }} className="input-field">
            <option value="" disabled>Select System Event...</option>
            <option value="welcome">Welcome / Verify Email</option>
            <option value="reset_password">Password Reset</option>
            <option value="application_received">Application Received</option>
            <option value="application_status">Application Status Update</option>
            <option value="payment_receipt">Payment Receipt (Stripe/PayPal)</option>
          </select>
          {editEmailEvent && (
            <>
              <input required placeholder="Email Subject" value={editEmailSubject} onChange={e => setEditEmailSubject(e.target.value)} className="input-field" />
              <textarea required placeholder="HTML Body Content..." value={editEmailBody} onChange={e => setEditEmailBody(e.target.value)} rows={6} className="input-field font-mono resize-y" />
              <button type="submit" className="btn-primary py-2.5 px-6 text-xs">Save Template Override</button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
