/**
 * System-supplied variables for campaign templates.
 *
 * Variables in this list are auto-filled at dispatch time:
 *  - `patient_*` come from each recipient's record.
 *  - `clinic_name` comes from the clinic record (same value for all recipients).
 *
 * Any template variable NOT in this list is treated as a "custom" variable
 * and must be supplied by the user when configuring the campaign
 * (passed via CreateCampaignDto.template_variables).
 */
export const SYSTEM_CAMPAIGN_VARIABLES = [
  'patient_name',
  'patient_first_name',
  'patient_last_name',
  'patient_phone',
  'patient_email',
  'clinic_name',
] as const;

export type SystemCampaignVariable = (typeof SYSTEM_CAMPAIGN_VARIABLES)[number];

export function isSystemVariable(name: string): boolean {
  return (SYSTEM_CAMPAIGN_VARIABLES as readonly string[]).includes(name);
}

/**
 * Given a template's declared variable list, return the names that the user
 * must fill in at campaign-config time.
 *
 * Templates can store variables either as a flat string[] (legacy / SMS / email)
 * or as { body: string[], buttons: [...] } (WhatsApp). We only inspect body vars.
 */
export function extractCustomVariableNames(
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

  return names.filter((n) => typeof n === 'string' && !isSystemVariable(n));
}
