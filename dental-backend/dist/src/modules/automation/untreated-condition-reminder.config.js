"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNTREATED_CONDITION_REMINDER_DELAYS = void 0;
exports.parseReminderDelayMinutes = parseReminderDelayMinutes;
exports.parseUntreatedConditionConfig = parseUntreatedConditionConfig;
exports.UNTREATED_CONDITION_REMINDER_DELAYS = [
    { value: '5m', label: '5 minutes (testing)', minutes: 5, testingOnly: true },
    { value: '10m', label: '10 minutes (testing)', minutes: 10, testingOnly: true },
    { value: '1M', label: '1 month', minutes: 30 * 24 * 60 },
    { value: '2M', label: '2 months', minutes: 60 * 24 * 60 },
    { value: '3M', label: '3 months', minutes: 90 * 24 * 60 },
    { value: '4M', label: '4 months', minutes: 120 * 24 * 60 },
    { value: '6M', label: '6 months', minutes: 180 * 24 * 60 },
    { value: '9M', label: '9 months', minutes: 270 * 24 * 60 },
    { value: '12M', label: '12 months (1 year)', minutes: 365 * 24 * 60 },
    { value: '18M', label: '18 months', minutes: 548 * 24 * 60 },
    { value: '24M', label: '24 months (2 years)', minutes: 730 * 24 * 60 },
];
const DELAY_MAP = new Map(exports.UNTREATED_CONDITION_REMINDER_DELAYS.map((d) => [d.value, d.minutes]));
function parseReminderDelayMinutes(value, fallback = exports.UNTREATED_CONDITION_REMINDER_DELAYS[2].minutes) {
    if (typeof value === 'number' && value > 0)
        return value;
    if (typeof value === 'string' && DELAY_MAP.has(value))
        return DELAY_MAP.get(value);
    return fallback;
}
function parseUntreatedConditionConfig(raw) {
    const cfg = raw ?? {};
    return {
        reminder_1_enabled: cfg.reminder_1_enabled !== false,
        reminder_1_delay: typeof cfg.reminder_1_delay === 'string' ? cfg.reminder_1_delay : '1M',
        reminder_2_enabled: cfg.reminder_2_enabled !== false,
        reminder_2_delay: typeof cfg.reminder_2_delay === 'string' ? cfg.reminder_2_delay : '3M',
    };
}
//# sourceMappingURL=untreated-condition-reminder.config.js.map