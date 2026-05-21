"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeHtmlEntities = decodeHtmlEntities;
exports.formatDoctorName = formatDoctorName;
exports.stripDoctorPrefix = stripDoctorPrefix;
function decodeHtmlEntities(value) {
    if (!value)
        return value ?? '';
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}
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