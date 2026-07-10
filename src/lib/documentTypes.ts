// Document requirement types are admin-managed (DocumentRequirementType,
// fetched via /api/apply/options or /api/admin/document-types) rather than
// a fixed enum — this file only holds the small, structurally-fixed
// exclusion sets that don't belong on the admin-editable list.

// Types outside the CIF/Agency self-report + per-country-requirement
// concept entirely: cv is handled by its own dedicated screening-gate
// upload button (never a checklist item), and the rest predate the
// programme-requirement model (Phase 4's broader case-document set,
// plus "other" which has no reachable UI path anywhere). Never shown in
// the CIF/Agency checklist or admin's per-country requirement toggle,
// regardless of what admin adds there.
export const NON_PROGRAMME_TYPE_KEYS = ["cv", "transcript", "certificate", "medical", "contract", "visa", "other"] as const;

// CaseDetail's staff upload picker excludes only cv/passport (already
// uploaded via the candidate's own dedicated screening-gate buttons).
export const CASE_UPLOAD_EXCLUDED_KEYS = ["cv", "passport", "other"] as const;

export function documentTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}
