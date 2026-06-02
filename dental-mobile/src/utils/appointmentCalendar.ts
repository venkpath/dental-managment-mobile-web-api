/** API may return `2026-06-01T00:00:00.000Z` — calendar keys need `2026-06-01`. */
export function normalizeAppointmentDate(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  const iso = trimmed.includes('T') ? (trimmed.split('T')[0] ?? '') : trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return toDateStr(parsed);
  return iso;
}

/** Build YYYY-MM-DD in local timezone. */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/** Sunday-start grid cells for a month (null = padding). */
export function buildMonthGrid(month: Date): Array<{ date: Date; inMonth: boolean } | null> {
  const start = monthStart(month);
  const end = monthEnd(month);
  const cells: Array<{ date: Date; inMonth: boolean } | null> = [];
  const pad = start.getDay();
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let day = 1; day <= end.getDate(); day++) {
    cells.push({ date: new Date(month.getFullYear(), month.getMonth(), day), inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
