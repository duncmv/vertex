"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";
import { Briefcase, Plus, Trash, FileText } from "@phosphor-icons/react";
import { DOCUMENT_TYPE_LABELS, CIF_PROGRAMME_SPECIFIC_DOCUMENT_TYPES } from "@/lib/documentTypes";

interface Sector {
  id: string;
  name: string;
}

interface Country {
  id: string;
  name: string;
  region: { id: string; name: string };
}

// Universal types (cv/passport/passport_photo) aren't listed here since
// every programme requires them regardless of country.
const DOCUMENT_TYPE_OPTIONS = CIF_PROGRAMME_SPECIFIC_DOCUMENT_TYPES.map((value) => ({
  value,
  label: DOCUMENT_TYPE_LABELS[value],
}));

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newSectorName, setNewSectorName] = useState("");
  const [creatingSector, setCreatingSector] = useState(false);

  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [requiredTypes, setRequiredTypes] = useState<Set<string>>(new Set());
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [savingRequirements, setSavingRequirements] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/sectors").then((r) => r.json()),
      fetch("/api/admin/countries").then((r) => r.json()),
    ])
      .then(([sectorsRes, countriesRes]) => {
        setSectors(sectorsRes.data ?? []);
        setCountries(countriesRes.data ?? []);
      })
      .catch(() => setError("Failed to load reference data."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!selectedCountryId) {
      setRequiredTypes(new Set());
      return;
    }
    setLoadingRequirements(true);
    fetch(`/api/admin/countries/${selectedCountryId}/document-requirements`)
      .then((r) => r.json())
      .then((res) => {
        const types: string[] = (res.data ?? []).map((r: { document_type: string }) => r.document_type);
        setRequiredTypes(new Set(types));
      })
      .catch(() => setError("Failed to load document requirements."))
      .finally(() => setLoadingRequirements(false));
  }, [selectedCountryId]);

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSector(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectorName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create sector.");
      setNewSectorName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sector.");
    } finally {
      setCreatingSector(false);
    }
  };

  const handleDeleteSector = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/sectors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete sector.");
      }
      setSectors((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sector.");
    }
  };

  const toggleDocumentType = (value: string) => {
    setRequiredTypes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const saveRequirements = async () => {
    if (!selectedCountryId) return;
    setSavingRequirements(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/countries/${selectedCountryId}/document-requirements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_types: Array.from(requiredTypes) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save document requirements.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document requirements.");
    } finally {
      setSavingRequirements(false);
    }
  };

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Reference data
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Sectors & Document Requirements</h1>
      <p className="text-midnight-900/55 font-light mb-10 max-w-2xl">
        The "Preferred Type of Work" options on the Candidate Information Form, and the extra documents
        each destination country requires beyond the universal passport/photo/CV set (Section 3).
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-8">{error}</div>
      )}

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleCreateSector} className="card p-6 mb-6">
              <h2 className="font-semibold text-midnight-900 mb-4 flex items-center gap-2">
                <Briefcase size={18} weight="regular" className="text-gold-600" /> Sectors
              </h2>
              <div className="flex gap-3">
                <input
                  value={newSectorName}
                  onChange={(e) => setNewSectorName(e.target.value)}
                  placeholder="e.g. Warehouse & Logistics"
                  required
                  className="input-field flex-1"
                />
                <button type="submit" disabled={creatingSector} className="btn-primary px-5 disabled:opacity-60">
                  <Plus size={16} weight="bold" />
                </button>
              </div>
            </form>

            {sectors.length === 0 ? (
              <div className="card p-8 text-center text-midnight-900/50">No sectors yet — add one above.</div>
            ) : (
              <div className="card p-4">
                <ul className="divide-y divide-midnight-900/5">
                  {sectors.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2.5 px-2">
                      <span className="text-sm text-midnight-900/80">{s.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSector(s.id)}
                        className="text-midnight-900/30 hover:text-red-500"
                      >
                        <Trash size={15} weight="regular" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-midnight-900 mb-4 flex items-center gap-2">
              <FileText size={18} weight="regular" className="text-gold-600" /> Document Requirements
            </h2>
            <select
              value={selectedCountryId}
              onChange={(e) => setSelectedCountryId(e.target.value)}
              className="input-field mb-4"
            >
              <option value="">Select a country…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.region.name})</option>
              ))}
            </select>

            {!selectedCountryId ? (
              <p className="text-sm text-midnight-900/40">Select a country to manage its extra document requirements.</p>
            ) : loadingRequirements ? (
              <p className="text-sm text-midnight-900/40">Loading…</p>
            ) : (
              <>
                <div className="space-y-2 mb-5 max-h-80 overflow-y-auto">
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-midnight-900/75 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredTypes.has(opt.value)}
                        onChange={() => toggleDocumentType(opt.value)}
                        className="w-4 h-4"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={saveRequirements}
                  disabled={savingRequirements}
                  className="btn-primary text-sm py-2.5 px-5 disabled:opacity-60"
                >
                  {savingRequirements ? "Saving…" : "Save Requirements"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
