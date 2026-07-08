"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";

interface Payment {
  id: string;
  amount: number;
  transaction_id: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  user: { full_name: string; email: string };
  job: { title: string };
}

export default function AdminFinancesPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments/admin")
      .then((r) => r.json())
      .then((res) => setPayments(Array.isArray(res) ? res : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = payments.reduce((acc, p) => acc + (p.payment_status === "completed" ? p.amount : 0), 0);
  const pendingCount = payments.filter((p) => p.payment_status === "pending").length;

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Finance
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-8">Finances.</h1>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <div className="card p-6">
              <div className="text-xs text-gold-600 font-semibold uppercase tracking-wider mb-1">Total Revenue</div>
              <div className="text-3xl font-semibold text-midnight-900">${totalRevenue.toFixed(2)}</div>
            </div>
            <div className="card p-6">
              <div className="text-xs text-gold-600 font-semibold uppercase tracking-wider mb-1">Total Transactions</div>
              <div className="text-3xl font-semibold text-midnight-900">{payments.length}</div>
            </div>
            <div className="card p-6">
              <div className="text-xs text-midnight-900/45 font-semibold uppercase tracking-wider mb-1">Pending Processing</div>
              <div className="text-3xl font-semibold text-midnight-900">{pendingCount}</div>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <div className="p-5 border-b border-midnight-900/10">
              <h2 className="font-semibold text-midnight-900">Transaction History</h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-10 text-center text-midnight-900/40">No transactions recorded yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 font-semibold">User details</th>
                    <th className="px-5 py-3 font-semibold">Job</th>
                    <th className="px-5 py-3 font-semibold text-right">Amount</th>
                    <th className="px-5 py-3 font-semibold">Gateway</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-midnight-900/5 last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-medium text-midnight-900">{p.user?.full_name}</div>
                        <div className="text-xs text-midnight-900/45">{p.user?.email}</div>
                      </td>
                      <td className="px-5 py-3 text-midnight-900/70">{p.job?.title}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${p.payment_status === "completed" ? "text-gold-600" : "text-midnight-900/50"}`}>
                          ${p.amount.toFixed(2)}
                        </span>
                        <div className="text-[10px] uppercase text-midnight-900/35">{p.payment_status}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="capitalize text-midnight-900/70">{p.payment_method}</span>
                        <div className="text-[10px] text-midnight-900/35 font-mono mt-0.5 truncate max-w-[120px]" title={p.transaction_id}>
                          {p.transaction_id}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-midnight-900/50 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </PortalShell>
  );
}
