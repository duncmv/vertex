"use client";

import { useEffect, useState, useCallback } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";
import { MagnifyingGlass, Plus, Copy, CheckCircle } from "@phosphor-icons/react";

const ROLES = [
  { value: "candidate", label: "Candidate" },
  { value: "regional_recruiter", label: "Regional Recruiter" },
  { value: "country_supervisor", label: "Country Supervisor" },
  { value: "inhouse_supervisor", label: "In-House Supervisor" },
  { value: "director", label: "Director" },
  { value: "admin", label: "System Administrator" },
];

// Only real staff roles can be created directly — candidates self-register.
const STAFF_ROLES = ROLES.filter((r) => r.value !== "candidate");

interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  supervisor_id: string | null;
  supervisor: { id: string; full_name: string } | null;
  assigned_country_id: string | null;
  assigned_country: { id: string; name: string } | null;
}

interface Country {
  id: string;
  name: string;
}

export default function StaffUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: "", email: "", role: "regional_recruiter" });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (roleFilter) params.set("role", roleFilter);
    if (q) params.set("q", q);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((res) => setUsers(res.data ?? []))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [roleFilter, q]);

  useEffect(() => {
    fetch("/api/admin/countries")
      .then((r) => r.json())
      .then((res) => setCountries(res.data ?? []));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(load, 250); // debounce search-as-you-type
    return () => clearTimeout(timeout);
  }, [load]);

  const patchUser = async (id: string, data: Record<string, unknown>) => {
    setSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Update failed.");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...body.data } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSavingId(null);
    }
  };

  const staffOptions = users.filter((u) => u.role !== "candidate");

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create staff member.");
      setCreatedCredentials({ email: newStaff.email, temporaryPassword: body.temporaryPassword });
      setNewStaff({ full_name: "", email: "", role: "regional_recruiter" });
      setShowCreateForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff member.");
    } finally {
      setCreating(false);
    }
  };

  const copyTempPassword = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(createdCredentials.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <div className="flex items-start justify-between gap-6 mb-2">
        <div>
          <p className="eyebrow mb-3">
            <span className="eyebrow-rule" />
            Agent network
          </p>
          <h1 className="section-title text-3xl md:text-4xl">Staff & Roles</h1>
        </div>
        <button
          onClick={() => { setShowCreateForm((v) => !v); setCreatedCredentials(null); }}
          className="btn-primary text-xs shrink-0"
        >
          <Plus size={16} weight="bold" /> Add Staff Member
        </button>
      </div>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Assign roles, direct supervisors (unity of command — SRS FR-1.3), and countries. Search any user, including
        candidates, to promote them into the agent network — or create a brand-new staff account directly below.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>
      )}

      {createdCredentials && (
        <div className="card p-6 mb-6 border-l-4 border-gold-400">
          <div className="flex items-start gap-3">
            <CheckCircle size={22} weight="fill" className="text-gold-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-midnight-900 mb-1">Staff account created</h3>
              <p className="text-sm text-midnight-900/60 mb-3">
                Share this temporary password with <span className="font-medium">{createdCredentials.email}</span> now —
                it will not be shown again.
              </p>
              <div className="flex items-center gap-3">
                <code className="bg-ivory-100 border border-midnight-900/10 rounded-lg px-4 py-2 text-sm font-mono text-midnight-900">
                  {createdCredentials.temporaryPassword}
                </code>
                <button onClick={copyTempPassword} className="btn-secondary py-2 px-4 text-xs">
                  <Copy size={14} weight="bold" /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateStaff} className="card p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-midnight-900">New staff member</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <input
              required
              placeholder="Full name"
              value={newStaff.full_name}
              onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
              className="input-field"
            />
            <input
              required
              type="email"
              placeholder="Email address"
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              className="input-field"
            />
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              className="input-field"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={creating} className="btn-primary text-xs disabled:opacity-60">
            {creating ? "Creating…" : "Create Account"}
          </button>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} weight="regular" className="absolute left-4 top-1/2 -translate-y-1/2 text-midnight-900/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            className="input-field pl-11"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field sm:w-56">
          <option value="">All staff roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : users.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No matching users.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Supervisor</th>
                <th className="px-5 py-3 font-semibold">Country</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium text-midnight-900">{u.full_name}</div>
                    <div className="text-xs text-midnight-900/45">{u.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      className="input-field py-2 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={u.supervisor_id ?? ""}
                      disabled={savingId === u.id || u.role === "candidate"}
                      onChange={(e) => patchUser(u.id, { supervisor_id: e.target.value || null })}
                      className="input-field py-2 text-xs disabled:opacity-40"
                    >
                      <option value="">— None —</option>
                      {staffOptions
                        .filter((s) => s.id !== u.id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={u.assigned_country_id ?? ""}
                      disabled={savingId === u.id || u.role === "candidate"}
                      onChange={(e) => patchUser(u.id, { assigned_country_id: e.target.value || null })}
                      className="input-field py-2 text-xs disabled:opacity-40"
                    >
                      <option value="">— None —</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
