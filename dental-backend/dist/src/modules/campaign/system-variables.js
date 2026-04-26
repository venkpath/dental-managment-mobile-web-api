"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCustomVariableNames = exports.SYSTEM_CAMPAIGN_VARIABLES = void 0;
exports.isSystemVariable = isSystemVariable;
exports.normalizeMapping = normalizeMapping;
exports.extractUserMappedVariableNames = extractUserMappedVariableNames;
exports.SYSTEM_CAMPAIGN_VARIABLES = [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'patient_phone',
    'patient_email',
    'clinic_name',
    'clinic_phone',
    'today_date',
];
function isSystemVariable(name) {
    return exports.SYSTEM_CAMPAIGN_VARIABLES.includes(name);
}
function normalizeMapping(input) {
    if (typeof input === 'string') {
        return { type: 'custom', value: input };
    }
    return input;
}
function extractUserMappedVariableNames(templateVariables) {
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
    const isNumbered = names.length > 0 && names.every((n) => /^\d+$/.test(n));
    if (isNumbered)
        return names;
    return names.filter((n) => typeof n === 'string' && !isSystemVariable(n));
}
exports.extractCustomVariableNames = extractUserMappedVariableNames;
//# sourceMappingURL=system-variables.js.map