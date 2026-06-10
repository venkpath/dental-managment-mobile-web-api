"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOSHOW_FOLLOWUP_TEMPLATE_NAME = void 0;
exports.isNoshowFollowupTemplate = isNoshowFollowupTemplate;
exports.buildNoshowFollowupVariables = buildNoshowFollowupVariables;
exports.validateNoshowFollowupVariables = validateNoshowFollowupVariables;
const insight_whatsapp_variables_util_js_1 = require("./insight-whatsapp-variables.util.js");
exports.NOSHOW_FOLLOWUP_TEMPLATE_NAME = 'dental_noshow_followup';
function isNoshowFollowupTemplate(templateName) {
    return templateName === exports.NOSHOW_FOLLOWUP_TEMPLATE_NAME;
}
function pick(existing, key, fallback) {
    const raw = existing?.[key]?.trim();
    return raw || fallback;
}
function buildNoshowFollowupVariables(input) {
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
function validateNoshowFollowupVariables(vars) {
    return (0, insight_whatsapp_variables_util_js_1.validateInsightWhatsappVariables)({
        '1': vars['1'] ?? '',
        '2': vars['2'] ?? '',
        '3': vars['3'] ?? '',
    });
}
//# sourceMappingURL=noshow-whatsapp-variables.util.js.map