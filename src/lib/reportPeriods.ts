// A weekly report is always a fixed Monday-Sunday, 7-day window (see
// submitReportSchema in validations.ts for why) — these helpers keep the
// UI's date pickers from ever producing a mismatched range in the first
// place, rather than relying on the server to reject it after the fact.

/** Given any date string (YYYY-MM-DD), returns that ISO week's Monday, as YYYY-MM-DD. */
export function mondayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day; // days to subtract to reach Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** The Sunday 6 days after a given Monday, as YYYY-MM-DD. */
export function sundayAfter(mondayStr: string): string {
  const d = new Date(`${mondayStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

/** Monday + Sunday for whatever week contains the given date. */
export function weekRangeContaining(dateStr: string): { start: string; end: string } {
  const start = mondayOfWeek(dateStr);
  return { start, end: sundayAfter(start) };
}
