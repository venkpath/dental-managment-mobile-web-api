"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDoctorName = formatDoctorName;
exports.stripDoctorPrefix = stripDoctorPrefix;
function formatDoctorName(name) {
    if (!name)
        return '—';
    const cleaned = name
        .trim()
        .replace(/^(dr\.?|doctor)\s+/i, '')
        .trim();
    if (!cleaned)
        return '—';
    return `Dr. ${cleaned}`;
}
function stripDoctorPrefix(name) {
    if (!name)
        return '';
    return name.trim().replace(/^(dr\.?|doctor)\s+/i, '').trim();
}
//# sourceMappingURL=name.util.js.map