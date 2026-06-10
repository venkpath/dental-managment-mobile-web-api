import { validateInsightWhatsappVariables } from './insight-whatsapp-variables.util.js';

export const NOSHOW_FOLLOWUP_TEMPLATE_NAME = 'dental_noshow_followup';

export function isNoshowFollowupTemplate(templateName: string): boolean {
  return templateName === NOSHOW_FOLLOWUP_TEMPLATE_NAME;
}

function pick(existing: Record<string, string> | undefined, key: string, fallback: string): string {
  const raw = existing?.[key]?.trim();
  return raw || fallback;
}

/** Meta {{1}} patient · {{2}} clinic · {{3}} phone */
export function buildNoshowFollowupVariables(input: {
  patientFirstName: string;
  patientLastName: string;
  clinicName: string;
  clinicPhone: string;
  existing?: Record<string, string>;
}): Record<string, string> {
  const name = `${input.patientFirstName} ${input.patientLastName}`.trim();
  const clinic = input.clinicName.trim();
  const phone = input.clinicPhone.trim();

  return {
    '1': pick(input.existing, '1', name),
    '2': pick(input.existing, '2', clinic),
    '3': pick(input.existing, '3', phone),
    patient_name: pick(input.existing, 'patient_name', name),
    patient_first_name: input.patientFirstName,
    clinic_name: pick(input.existing, 'clinic_name', clinic),
    phone: pick(input.existing, 'phone', phone),
    clinic_phone: pick(input.existing, 'clinic_phone', phone),
  };
}

export function validateNoshowFollowupVariables(vars: Record<string, string>): string | null {
  return validateInsightWhatsappVariables({
    '1': vars['1'] ?? '',
    '2': vars['2'] ?? '',
    '3': vars['3'] ?? '',
  });
}
