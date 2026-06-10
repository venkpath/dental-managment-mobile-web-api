"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSIGHT_WHATSAPP_TEMPLATE_NAMES = void 0;
exports.isInsightWhatsappTemplate = isInsightWhatsappTemplate;
exports.buildInsightWhatsappVariables = buildInsightWhatsappVariables;
exports.validateInsightWhatsappVariables = validateInsightWhatsappVariables;
exports.INSIGHT_WHATSAPP_TEMPLATE_NAMES = new Set([
    'dental_treatment_followup_due',
    'dental_treatment_followup_overdue',
    'dental_reengagement_soft',
    'dental_reengagement_offer',
]);
function isInsightWhatsappTemplate(templateName) {
    return exports.INSIGHT_WHATSAPP_TEMPLATE_NAMES.has(templateName);
}
function formatDurationSince(date) {
    if (!date)
        return '';
    const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
    if (days <= 0)
        return 'today';
    return days === 1 ? '1 day' : `${days} days`;
}
function pick(existing, key, fallback) {
    const raw = existing?.[key]?.trim();
    return raw || fallback;
}
function buildInsightWhatsappVariables(input) {
    const name = `${input.patientFirstName} ${input.patientLastName}`.trim();
    const treatment = input.recallTreatment?.trim() || 'your treatment';
    let daysSince = formatDurationSince(input.recallLastDate);
    if (!daysSince && input.recallDueDays != null && input.recallDueDays < 0) {
        const d = Math.abs(input.recallDueDays);
        daysSince = d === 1 ? '1 day' : `${d} days`;
    }
    const daysOverdue = input.recallDueDays != null && input.recallDueDays >= 0 ? String(input.recallDueDays) : '';
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
function validateInsightWhatsappVariables(vars) {
    const empty = Object.entries(vars).filter(([, v]) => !v?.trim()).map(([k]) => `{{${k}}}`);
    if (empty.length === 0)
        return null;
    return `Missing WhatsApp template parameters: ${empty.join(', ')}`;
}
//# sourceMappingURL=insight-whatsapp-variables.util.js.map