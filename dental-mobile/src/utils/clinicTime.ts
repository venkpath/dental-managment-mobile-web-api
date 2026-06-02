/** Matches backend CLINIC_TIMEZONE (Asia/Kolkata) for greetings and "today" labels. */
const CLINIC_TZ = 'Asia/Kolkata';

export function getClinicGreeting(reference: Date = new Date()): string {
  const hourStr = reference.toLocaleString('en-GB', {
    timeZone: CLINIC_TZ,
    hour: 'numeric',
    hour12: false,
  });
  const h = parseInt(hourStr, 10);
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getClinicTodayDateString(reference: Date = new Date()): string {
  return reference.toLocaleDateString('en-CA', { timeZone: CLINIC_TZ });
}
