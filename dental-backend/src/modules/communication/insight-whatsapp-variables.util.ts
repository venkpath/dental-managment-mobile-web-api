/** Meta-approved AI Insights WhatsApp templates — variable slots must all be sent. */
export const INSIGHT_WHATSAPP_TEMPLATE_NAMES = new Set([
  'dental_treatment_followup_due',
  'dental_treatment_followup_overdue',
  'dental_reengagement_soft',
  'dental_reengagement_offer',
]);

export function isInsightWhatsappTemplate(templateName: string): boolean {
  return INSIGHT_WHATSAPP_TEMPLATE_NAMES.has(templateName);
}

function formatDurationSince(date: Date | null | undefined): string {
  if (!date) return '';
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  return days === 1 ? '1 day' : `${days} days`;
}

export type InsightWhatsappBuildInput = {
  templateName: string;
  patientFirstName: string;
  patientLastName: string;
  clinicName: string;
  clinicPhone: string;
  bookingUrl: string;
  recallTreatment?: string | null;
  recallDueDays?: number | null;
  recallLastDate?: Date | null;
  offerText?: string | null;
  existing?: Record<string, string>;
};

function pick(existing: Record<string, string> | undefined, key: string, fallback: string): string {
  const raw = existing?.[key]?.trim();
  return raw || fallback;
}

/** Build numbered Meta {{1}}…{{6}} variables for approved insight templates. */
export function buildInsightWhatsappVariables(input: InsightWhatsappBuildInput): Record<string, string> {
  const name = `${input.patientFirstName} ${input.patientLastName}`.trim();
  const treatment = input.recallTreatment?.trim() || 'your treatment';
  let daysSince = formatDurationSince(input.recallLastDate);
  if (!daysSince && input.recallDueDays != null && input.recallDueDays < 0) {
    const d = Math.abs(input.recallDueDays);
    daysSince = d === 1 ? '1 day' : `${d} days`;
  }
  const daysOverdue =
    input.recallDueDays != null && input.recallDueDays >= 0 ? String(input.recallDueDays) : '';
  const ex = input.existing;

  switch (input.templateName) {
    case 'dental_treatment_followup_due':
      return {
        '1': pick(ex, '1', name),
        '2': pick(ex, '2', treatment),
        '3': pick(ex, '3', daysSince),
        '4': pick(ex, '4', input.clinicName),
        '5': pick(ex, '5', input.bookingUrl),
        '6': pick(ex, '6', input.clinicPhone),
      };
    case 'dental_treatment_followup_overdue':
      return {
        '1': pick(ex, '1', name),
        '2': pick(ex, '2', treatment),
        '3': pick(ex, '3', input.clinicName),
        '4': pick(ex, '4', daysOverdue),
        '5': pick(ex, '5', input.bookingUrl),
        '6': pick(ex, '6', input.clinicPhone),
      };
    case 'dental_reengagement_soft':
      return {
        '1': pick(ex, '1', name),
        '2': pick(ex, '2', input.clinicName),
        '3': pick(ex, '3', input.bookingUrl),
        '4': pick(ex, '4', input.clinicPhone),
      };
    case 'dental_reengagement_offer':
      return {
        '1': pick(ex, '1', name),
        '2': pick(ex, '2', input.clinicName),
        '3': pick(ex, '3', input.offerText?.trim() || 'a special offer on your next visit'),
        '4': pick(ex, '4', input.bookingUrl),
        '5': pick(ex, '5', input.clinicPhone),
      };
    default:
      return {};
  }
}

export function validateInsightWhatsappVariables(vars: Record<string, string>): string | null {
  const empty = Object.entries(vars).filter(([, v]) => !v?.trim()).map(([k]) => `{{${k}}}`);
  if (empty.length === 0) return null;
  return `Missing WhatsApp template parameters: ${empty.join(', ')}`;
}
