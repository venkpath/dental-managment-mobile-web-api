"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_CAMPAIGN_VARIABLES = void 0;
exports.isSystemVariable = isSystemVariable;
exports.extractCustomVariableNames = extractCustomVariableNames;
exports.SYSTEM_CAMPAIGN_VARIABLES = [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'patient_phone',
    'patient_email',
    'clinic_name',
];
function isSystemVariable(name) {
    return exports.SYSTEM_CAMPAIGN_VARIABLES.includes(name);
}
function extractCustomVariableNames(templateVariables) {
    let names = [];
    if (Array.isArray(templateVariables)) {
        names = templateVariables;
    }
    else if (templateVariables &&
        typeof templateVariables === 'object' &&
        'body' in templateVariables &&
        Array.isArray(templateVariables.body)) {
        names = templateVariables.body;
    }
    return names.filter((n) => typeof n === 'string' && !isSystemVariable(n));
}
//# sourceMappingURL=system-variables.js.map