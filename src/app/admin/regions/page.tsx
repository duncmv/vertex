"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";
import { GlobeHemisphereWest, Plus, MapPin } from "@phosphor-icons/react";

interface Country {
  id: string;
  name: string;
  region: { id: string; name: string };
}

interface Region {
  id: string;
  name: string;
  countries: { id: string; name: string }[];
}

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newRegionName, setNewRegionName] = useState("");
  const [creatingRegion, setCreatingRegion] = useState(false);

  const [newCountryName, setNewCountryName] = useState("");
  const [newCountryRegionId, setNewCountryRegionId] = useState("");
  const [creatingCountry, setCreatingCountry] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/regions")
      .then((r) => r.json())
      .then((res) => setRegions(res.data ?? []))
      .catch(() => setError("Failed to load regions."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingRegion(true);
    setError("");
    try {
      const res = await fetch("/api/admin/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRegionName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create region.");
      setNewRegionName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create region.");
    } finally {
      setCreatingRegion(false);
    }
  };

  const handleCreateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCountry(true);
    setError("");
    try {
      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCountryName, region_id: newCountryRegionId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create country.");
      setNewCountryName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create country.");
    } finally {
      setCreatingCountry(false);
    }
  };

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Reference data
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Regions & Countries</h1>
      <p className="text-midnight-900/55 font-light mb-10 max-w-2xl">
        The structure recruiters and candidates are attributed to (SRS FR-1.4). Add regions first, then countries within them.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-8">{error}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <form onSubmit={handleCreateRegion} className="card p-6">
          <h2 className="font-semibold text-midnight-900 mb-4">Add a region</h2>
          <div className="flex gap-3">
            <input
              value={newRegionName}
              onChange={(e) => setNewRegionName(e.target.value)}
              placeholder="e.g. East Africa"
              required
              className="input-field flex-1"
            />
            <button type="submit" disabled={creatingRegion} className="btn-primary px-5 disabled:opacity-60">
              <Plus size={16} weight="bold" />
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateCountry} className="card p-6">
          <h2 className="font-semibold text-midnight-900 mb-4">Add a country</h2>
          <div className="flex gap-3">
            <select
              value={newCountryRegionId}
              onChange={(e) => setNewCountryRegionId(e.target.value)}
              required
              className="input-field w-40"
            >
              <option value="">Region…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <input
              value={newCountryName}
              onChange={(e) => setNewCountryName(e.target.value)}
              placeholder="e.g. Kenya"
              required
              className="input-field flex-1"
            />
            <button type="submit" disabled={creatingCountry} className="btn-primary px-5 disabled:opacity-60">
              <Plus size={16} weight="bold" />
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : regions.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No regions yet — add one above.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {regions.map((region) => (
            <div key={region.id} className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <GlobeHemisphereWest size={18} weight="regular" className="text-gold-600" />
                <h3 className="font-semibold text-midnight-900 tracking-tight">{region.name}</h3>
              </div>
              {region.countries.length === 0 ? (
                <p className="text-sm text-midnight-900/40">No countries yet.</p>
              ) : (
                <ul className="space-y-2">
                  {region.countries.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm text-midnight-900/70">
                      <MapPin size={14} weight="regular" className="text-midnight-900/30" />
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
