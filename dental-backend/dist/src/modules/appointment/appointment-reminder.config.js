"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReminderDefinitions = getReminderDefinitions;
exports.isReminderEnabled = isReminderEnabled;
function parseHours(raw, fallback) {
    const parsed = typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
            ? Number(raw.trim())
            : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parseEnabled(raw, fallback = true) {
    if (typeof raw === 'boolean')
        return raw;
    if (typeof raw === 'number')
        return raw !== 0;
    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase();
        if (['false', '0', 'no', 'off'].includes(normalized))
            return false;
        if (['true', '1', 'yes', 'on'].includes(normalized))
            return true;
    }
    return fallback;
}
function getReminderDefinitions(config) {
    return [
        {
            index: 1,
            hours: parseHours(config['reminder_1_hours'], 24),
            enabled: parseEnabled(config['reminder_1_enabled'], true),
        },
        {
            index: 2,
            hours: parseHours(config['reminder_2_hours'], 2),
            enabled: parseEnabled(config['reminder_2_enabled'], true),
        },
    ];
}
function isReminderEnabled(config, reminderIndex, fallback = true) {
    return parseEnabled(config[`reminder_${reminderIndex}_enabled`], fallback);
}
//# sourceMappingURL=appointment-reminder.config.js.map