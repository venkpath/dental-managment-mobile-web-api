const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatWorkingDays(csv?: string | null): string {
  if (!csv?.trim()) return 'Mon–Sat (default)';
  const days = csv.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => d >= 1 && d <= 7);
  if (days.length === 0) return '—';
  return days.map((d) => DAY_NAMES[d - 1]).join(', ');
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  return `${start ?? '09:00'} – ${end ?? '18:00'}`;
}
