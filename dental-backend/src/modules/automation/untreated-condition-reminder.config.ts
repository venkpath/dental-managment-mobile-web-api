/**
 * Configurable delays for untreated dental-condition reminders.
 * Values are stored in AutomationRule.config as reminder_1_delay / reminder_2_delay.
 */

export interface ReminderDelayOption {
  value: string;
  label: string;
  /** Delay in minutes from anchor (earliest untreated condition date). */
  minutes: number;
  /** True for 5m / 10m — remove from UI once testing is done. */
  testingOnly?: boolean;
}

export const UNTREATED_CONDITION_REMINDER_DELAYS: ReminderDelayOption[] = [
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

const DELAY_MAP = new Map(UNTREATED_CONDITION_REMINDER_DELAYS.map((d) => [d.value, d.minutes]));

export function parseReminderDelayMinutes(value: unknown, fallback = UNTREATED_CONDITION_REMINDER_DELAYS[2].minutes): number {
  if (typeof value === 'number' && value > 0) return value;
  if (typeof value === 'string' && DELAY_MAP.has(value)) return DELAY_MAP.get(value)!;
  return fallback;
}

export interface UntreatedConditionReminderConfig {
  reminder_1_enabled: boolean;
  reminder_1_delay: string;
  reminder_2_enabled: boolean;
  reminder_2_delay: string;
}

export function parseUntreatedConditionConfig(raw: Record<string, unknown> | null | undefined): UntreatedConditionReminderConfig {
  const cfg = raw ?? {};
  return {
    reminder_1_enabled: cfg.reminder_1_enabled !== false,
    reminder_1_delay: typeof cfg.reminder_1_delay === 'string' ? cfg.reminder_1_delay : '1M',
    reminder_2_enabled: cfg.reminder_2_enabled !== false,
    reminder_2_delay: typeof cfg.reminder_2_delay === 'string' ? cfg.reminder_2_delay : '3M',
  };
}
