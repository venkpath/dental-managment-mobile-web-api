/**
 * System variable catalog used when mapping campaign-template variables
 * (e.g. WhatsApp {{1}}, {{2}}) to data the platform fills in at send time.
 *
 * The campaign wizard lets the user pick, for each variable slot, either:
 *   - a SYSTEM key from this list (resolved per recipient at dispatch), OR
 *   - a CUSTOM static text (same string sent to every recipient).
 *
 * Keep this list in sync with the frontend constant of the same name in
 * dental-frontend/src/lib/system-variables.ts.
 */

export const SYSTEM_CAMPAIGN_VARIABLES = [
  'patient_name',
  'patient_first_name',
  'patient_last_name',
  'patient_phone',
  'patient_email',
  'clinic_name',
  'clinic_phone',
  'today_date',
] as const;

export type SystemCampaignVariable = (typeof SYSTEM_CAMPAIGN_VARIABLES)[number];

export function isSystemVariable(name: string): boolean {
  return (SYSTEM_CAMPAIGN_VARIABLES as readonly string[]).includes(name);
}

/**
 * Structured mapping the campaign wizard sends per template variable.
 *  - { type: 'system', key } → resolved per recipient at dispatch
 *  - { type: 'custom', value } → same literal sent to every recipient
 *
 * For backward compatibility a plain string is also accepted and treated as
 * { type: 'custom', value: <string> }.
 */
export type CampaignVariableMapping =
  | { type: 'system'; key: SystemCampaignVariable }
  | { type: 'custom'; value: string };

export type CampaignVariableMappingInput = CampaignVariableMapping | string;

export function normalizeMapping(input: CampaignVariableMappingInput): CampaignVariableMapping {
  if (typeof input === 'string') {
    return { type: 'custom', value: input };
  }
  return input;
}

/**
 * For validation in the campaign service: returns names that the user must
 * map (i.e. variables that aren't already auto-filled by the patient/clinic
 * lookup the platform does for free).
 *
 * For NUMBERED templates ({{1}}, {{2}}), every slot is "user-mapped" since
 * the platform can't guess what each position means.
 *
 * For NAMED templates ({{patient_name}}, {{festival_name}}), only the
 * names outside the system catalog need a mapping.
 */
export function extractUserMappedVariableNames(
  templateVariables: unknown,
): string[] {
  let names: string[] = [];

  if (Array.isArray(templateVariables)) {
    names = templateVariables as string[];
  } else if (
    templateVariables &&
    typeof templateVariables === 'object' &&
    'body' in templateVariables &&
    Array.isArray((templateVariables as { body: unknown }).body)
  ) {
    names = (templateVariables as { body: string[] }).body;
  }

  // Numbered template — every slot needs a mapping
  const isNumbered = names.length > 0 && names.every((n) => /^\d+$/.test(n));
  if (isNumbered) return names;

  // Named template — only non-system names need mapping
  return names.filter((n) => typeof n === 'string' && !isSystemVariable(n));
}

// Legacy alias kept so existing callers don't break.
export const extractCustomVariableNames = extractUserMappedVariableNames;
