/** Clinic calendar timezone — dental clinics default to IST. */
export const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';

/** YYYY-MM-DD for "today" in the clinic timezone. */
export function getClinicTodayDateString(reference: Date = new Date()): string {
  return reference.toLocaleDateString('en-CA', { timeZone: CLINIC_TIMEZONE });
}

/** Hour 0–23 in clinic timezone (for greetings, quiet hours, etc.). */
export function getClinicHour(reference: Date = new Date()): number {
  const hourStr = reference.toLocaleString('en-GB', {
    timeZone: CLINIC_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(hourStr, 10);
}

export function getClinicGreeting(reference: Date = new Date()): string {
  const h = getClinicHour(reference);
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Add calendar days to a YYYY-MM-DD string (noon UTC anchor avoids DST edge cases). */
export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** UTC-midnight Date objects matching how appointment @db.Date rows are stored. */
export function clinicDateToUtcMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * SQL expression: calendar date of a payment in the clinic timezone.
 * `payments.paid_at` is TIMESTAMP WITHOUT TIME ZONE; Prisma persists UTC
 * wall-clock from Node. Treat as UTC first, then convert to clinic TZ.
 */
export function clinicPaymentLocalDateExpr(column = 'p.paid_at'): string {
  const zone = CLINIC_TIMEZONE.replace(/'/g, "''");
  return `((${column} AT TIME ZONE 'UTC') AT TIME ZONE '${zone}')::date`;
}
