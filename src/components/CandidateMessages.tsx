"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";

interface Message {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender: { full_name: string; role: string };
}

interface Props {
  candidateId: string;
}

/**
 * One continuous message thread between a candidate and their assigned
 * recruiter (2026-07-13, confirmed with the business) — reused as-is on
 * both the recruiter's candidate detail page and the candidate's own
 * dashboard, since it's the same thread either way, not two separate
 * views of different data.
 */
export default function CandidateMessages({ candidateId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    fetch(`/api/candidates/${candidateId}/messages`)
      .then((r) => r.json())
      .then((res) => setMessages(res.data ?? []))
      .catch(() => setError("Failed to load messages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { data: null }))
      .then((res) => setCurrentUserId(res.data?.userId ?? null))
      .catch(() => {});
  }, []);

  useEffect(load, [candidateId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/candidates/${candidateId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to send message.");
      setDraft("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Messages</h2>
      <div className="max-h-96 overflow-y-auto space-y-3 mb-4 pr-1">
        {loading ? (
          <p className="text-sm text-midnight-900/40">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-midnight-900/40">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-gold-400 text-midnight-950" : "bg-ivory-100 text-midnight-900"}`}>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "text-midnight-950/50" : "text-midnight-900/40"}`}>
                    {m.sender.full_name} · {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

      <div className="flex items-end gap-2 pt-2 border-t border-midnight-900/10">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          rows={2}
          className="input-field flex-1 resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          disabled={sending || !draft.trim()}
          onClick={send}
          className="btn-primary py-2.5 px-4 text-xs disabled:opacity-50 shrink-0"
          aria-label="Send message"
        >
          <PaperPlaneRight size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
