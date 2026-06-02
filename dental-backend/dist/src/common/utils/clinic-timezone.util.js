"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLINIC_TIMEZONE = void 0;
exports.getClinicTodayDateString = getClinicTodayDateString;
exports.getClinicHour = getClinicHour;
exports.getClinicGreeting = getClinicGreeting;
exports.addDaysToDateString = addDaysToDateString;
exports.clinicDateToUtcMidnight = clinicDateToUtcMidnight;
exports.clinicPaymentLocalDateExpr = clinicPaymentLocalDateExpr;
exports.CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';
function getClinicTodayDateString(reference = new Date()) {
    return reference.toLocaleDateString('en-CA', { timeZone: exports.CLINIC_TIMEZONE });
}
function getClinicHour(reference = new Date()) {
    const hourStr = reference.toLocaleString('en-GB', {
        timeZone: exports.CLINIC_TIMEZONE,
        hour: 'numeric',
        hour12: false,
    });
    return parseInt(hourStr, 10);
}
function getClinicGreeting(reference = new Date()) {
    const h = getClinicHour(reference);
    if (h < 12)
        return 'Good morning';
    if (h < 17)
        return 'Good afternoon';
    return 'Good evening';
}
function addDaysToDateString(dateStr, days) {
    const d = new Date(`${dateStr}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
function clinicDateToUtcMidnight(dateStr) {
    return new Date(`${dateStr}T00:00:00.000Z`);
}
function clinicPaymentLocalDateExpr(column = 'p.paid_at') {
    const zone = exports.CLINIC_TIMEZONE.replace(/'/g, "''");
    return `((${column} AT TIME ZONE 'UTC') AT TIME ZONE '${zone}')::date`;
}
//# sourceMappingURL=clinic-timezone.util.js.map