/**
 * Canonical procedure catalogue — keep in sync with
 * dental-frontend/src/lib/treatment-procedures.ts
 */

export const FREQUENT_TREATMENT_PROCEDURES = [
  'RCT',
  'Extraction',
  'Filling',
  'Crown',
  'Scaling',
  'Bridge',
  'Implant',
  'Orthodontics',
  'Denture',
  'Teeth Whitening',
] as const;

export const ADDITIONAL_TREATMENT_PROCEDURES = [
  'Re-RCT',
  'Root Planing',
  'Veneer',
  'Inlay',
  'Onlay',
  'Pulpectomy',
  'Pulpotomy',
  'Periapical Surgery',
] as const;

export const TREATMENT_PROCEDURE_OPTIONS = [
  ...FREQUENT_TREATMENT_PROCEDURES,
  ...ADDITIONAL_TREATMENT_PROCEDURES,
  'Other',
] as const;

export const OTHER_PROCEDURE = 'Other';

export const LEGACY_PROCEDURE_ALIASES: Record<string, string> = {
  'Root Canal Treatment': 'RCT',
  'Root canal treatment': 'RCT',
  'Root Canal': 'RCT',
  'Root canal': 'RCT',
  'Dental Filling': 'Filling',
  'Composite Filling': 'Filling',
  'GIC Filling': 'Filling',
  'Amalgam Filling': 'Filling',
  'Restoration': 'Filling',
  'Tooth Extraction': 'Extraction',
  'Surgical Extraction': 'Extraction',
  'Wisdom Tooth Extraction': 'Extraction',
  'Impaction Removal': 'Extraction',
  'Cleaning': 'Scaling',
  'Oral Prophylaxis': 'Scaling',
  'Polishing': 'Scaling',
  'Braces': 'Orthodontics',
  'Aligners': 'Orthodontics',
  'Partial Denture': 'Denture',
  'Complete Denture': 'Denture',
  'Teeth whitening': 'Teeth Whitening',
};

const KNOWN = new Set<string>(TREATMENT_PROCEDURE_OPTIONS);

const ALIAS_TO_CANONICAL = new Map<string, string>(
  Object.entries(LEGACY_PROCEDURE_ALIASES).map(([k, v]) => [k.toLowerCase(), v]),
);

export function normalizeProcedureName(value: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (KNOWN.has(trimmed)) return trimmed;
  const alias = ALIAS_TO_CANONICAL.get(trimmed.toLowerCase());
  if (alias) return alias;
  return trimmed;
}

export function isKnownTreatmentProcedure(value: string): boolean {
  return KNOWN.has(normalizeProcedureName(value));
}

export function getProcedureOptionsForPicker(): readonly string[] {
  return TREATMENT_PROCEDURE_OPTIONS;
}

export function procedureSelectValue(stored: string): string {
  const canonical = normalizeProcedureName(stored);
  if (!canonical) return '';
  return KNOWN.has(canonical) ? canonical : OTHER_PROCEDURE;
}

export function procedureCustomText(stored: string): string {
  const canonical = normalizeProcedureName(stored);
  if (!canonical || KNOWN.has(canonical)) return '';
  if (ALIAS_TO_CANONICAL.has(stored.trim().toLowerCase())) return '';
  return stored.trim();
}

export function resolveProcedureForSave(selected: string, customText: string): string {
  if (selected === OTHER_PROCEDURE) {
    return customText.trim();
  }
  return selected;
}

export function validateProcedureSelection(selected: string, customText: string): string | null {
  if (!selected) return 'Select a procedure';
  if (selected === OTHER_PROCEDURE && !customText.trim()) {
    return 'Enter the procedure name';
  }
  return null;
}

export function mapTextToCatalogProcedure(name: string): string {
  const normalized = normalizeProcedureName(name);
  if (KNOWN.has(normalized)) return normalized;

  const lower = name.toLowerCase();
  if (/re-?rct|retreat/i.test(lower)) return 'Re-RCT';
  if (/root\s*canal|rct\b|endodont|pulpect|pulpot|apico|periapical/i.test(lower)) return 'RCT';
  if (/extract|exodont|impaction|wisdom/i.test(lower)) return 'Extraction';
  if (/filling|composite|gic|amalgam|restoration|inlay|onlay/i.test(lower)) return 'Filling';
  if (/veneer/i.test(lower)) return 'Veneer';
  if (/crown|cap(?!ping)/i.test(lower)) return 'Crown';
  if (/bridge/i.test(lower)) return 'Bridge';
  if (/implant/i.test(lower)) return 'Implant';
  if (/root\s*plan|srp/i.test(lower)) return 'Root Planing';
  if (/scaling|prophy|cleaning|polish/i.test(lower)) return 'Scaling';
  if (/ortho|braces|aligner/i.test(lower)) return 'Orthodontics';
  if (/denture/i.test(lower)) return 'Denture';
  if (/whiten|bleach/i.test(lower)) return 'Teeth Whitening';
  return OTHER_PROCEDURE;
}
