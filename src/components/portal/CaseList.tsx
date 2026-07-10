"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react";
import { CASE_STAGE_LABELS, type CaseStageKey } from "./caseStages";
import CaseStageProgress from "./CaseStageProgress";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";

interface CaseRow {
  id: string;
  current_stage: CaseStageKey;
  stage_deadline: string | null;
  contract: { status: string } | null;
  retention_follow_up: { due_at: string; completed_at: string | null } | null;
  application: {
    candidate: {
      full_name: string | null;
      user: { full_name: string; email: string } | null;
      recruiter: { full_name: string } | null;
    };
    job: { title: string; country: string; city: string } | null;
    preferred_country_1: { name: string } | null;
    preferred_sector: { name: string } | null;
  };
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
        <WarningCircle size={13} weight="fill" /> Overdue {Math.abs(days)}d
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
        <WarningCircle size={13} weight="fill" /> Due in {days}d
      </span>
    );
  }
  return <span className="text-xs text-midnight-900/40">Due {new Date(deadline).toLocaleDateString()}</span>;
}

export default function CaseList({ emptyLabel, basePath }: { emptyLabel: string; basePath: string }) {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((res) => setCases(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const { page, setPage, totalPages, paged, total, pageSize } = usePagination(cases);

  if (loading) return <p className="text-midnight-900/50">Loading…</p>;
  if (cases.length === 0) return <div className="card p-10 text-center text-midnight-900/50">{emptyLabel}</div>;

  return (
    <div className="space-y-3">
      {paged.map((c) => {
        const name = c.application.candidate.user?.full_name ?? c.application.candidate.full_name ?? "— unnamed —";
        return (
          <Link
            key={c.id}
            href={`${basePath}/${c.id}`}
            className="card p-5 flex items-center justify-between gap-6 hover:shadow-md transition-shadow"
          >
            <div className="min-w-0">
              <div className="font-medium text-midnight-900">{name}</div>
              <div className="text-xs text-midnight-900/45 mb-3">
                {c.application.job
                  ? <>{c.application.job.title} · {c.application.job.city}, {c.application.job.country}</>
                  : <>{c.application.preferred_sector?.name ?? "General Programme"}{c.application.preferred_country_1 && <> · {c.application.preferred_country_1.name}</>}</>}
                {c.application.candidate.recruiter && <> · {c.application.candidate.recruiter.full_name}</>}
              </div>
              <div className="w-72 max-w-full">
                <CaseStageProgress stage={c.current_stage} />
              </div>
            </div>
            <div className="shrink-0 text-right space-y-1.5">
              <DeadlineBadge deadline={c.stage_deadline} />
              {c.contract && <div className="text-xs text-midnight-900/40 capitalize">Contract: {c.contract.status}</div>}
              {c.retention_follow_up && !c.retention_follow_up.completed_at && (
                <div className="text-xs text-amber-700 font-semibold">Retention follow-up due</div>
              )}
            </div>
          </Link>
        );
      })}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
