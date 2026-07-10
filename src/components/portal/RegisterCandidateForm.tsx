"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import ApplicationForm from "@/components/ApplicationForm";

interface Props {
  onRegistered: () => void;
}

interface Partner {
  id: string;
  name: string;
}

/**
 * A recruiter's first action with a walk-in lead: the same Candidate
 * Information Form everyone else fills in (SRS FR-2.1) — no separate
 * lightweight quick-add anymore. Submitting it creates the Candidate
 * record itself, with this recruiter attributed as its owner. An optional
 * "sourced via partner" select (SRS FR-5.1) attributes the lead to the
 * agency that referred them instead of a plain walk-in.
 */
export default function RegisterCandidateForm({ onRegistered }: Props) {
  const [open, setOpen] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/partners")
      .then((r) => r.json())
      .then((res) => setPartners(res.data ?? []))
      .catch(() => {});
  }, [open]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-xs mb-6">
        <Plus size={16} weight="bold" /> Register Candidate
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-midnight-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 sm:p-8 relative">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-midnight-900/40 hover:text-midnight-900"
        >
          <X size={20} weight="bold" />
        </button>
        <h2 className="text-xl font-black text-midnight-900 mb-1">Candidate Information Form</h2>
        <p className="text-sm text-midnight-900/50 mb-4">New candidate lead — filled in on their behalf.</p>
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Sourced via partner <span className="text-slate-400 font-normal">(optional)</span></label>
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input-field">
            <option value="">None — walk-in lead</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <ApplicationForm
          includePersonalInfo
          compact
          partnerId={partnerId || undefined}
          onSubmitted={() => {
            setOpen(false);
            onRegistered();
          }}
        />
      </div>
    </div>
  );
}
