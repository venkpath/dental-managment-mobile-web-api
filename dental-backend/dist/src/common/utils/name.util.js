"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDoctorName = formatDoctorName;
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
//# sourceMappingURL=name.util.js.map