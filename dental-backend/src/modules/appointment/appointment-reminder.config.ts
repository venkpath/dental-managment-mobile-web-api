export interface ReminderDefinition {
  index: 1 | 2;
  hours: number;
  enabled: boolean;
}

function parseHours(raw: unknown, fallback: number): number {
  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw.trim())
        : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEnabled(raw: unknown, fallback = true): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  }
  return fallback;
}

export function getReminderDefinitions(config: Record<string, unknown>): ReminderDefinition[] {
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

export function isReminderEnabled(
  config: Record<string, unknown>,
  reminderIndex: 1 | 2,
  fallback = true,
): boolean {
  return parseEnabled(config[`reminder_${reminderIndex}_enabled`], fallback);
}