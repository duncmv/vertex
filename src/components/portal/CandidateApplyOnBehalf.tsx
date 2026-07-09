"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import ApplicationForm from "@/components/ApplicationForm";

interface Props {
  candidateId: string;
  onSubmitted: () => void;
}

/**
 * Lets a recruiter submit a real Candidate Information Form on behalf of a
 * guided-to-apply candidate who has no account of their own yet (SRS
 * FR-2.1). This is what actually advances the candidate to "submitted" —
 * there's no manual status flag anymore, only a genuine Application record.
 */
export default function CandidateApplyOnBehalf({ candidateId, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-gold-600 hover:underline"
      >
        Submit application on their behalf
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
        <p className="text-sm text-midnight-900/50 mb-6">Submitted on this candidate&apos;s behalf.</p>
        <ApplicationForm
          candidateId={candidateId}
          compact
          onSubmitted={() => {
            setOpen(false);
            onSubmitted();
          }}
        />
      </div>
    </div>
  );
}
