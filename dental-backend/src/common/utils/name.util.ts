/**
 * Normalize a doctor's name to always render with a single "Dr." prefix.
 * Strips any existing leading "Dr.", "Dr ", "DR.", "doctor" (case-insensitive)
 * before re-adding "Dr. ", so we never produce "Dr. Dr. Priya".
 *
 * Returns an em-dash for empty/null/undefined input.
 */
export function formatDoctorName(name?: string | null): string {
  if (!name) return '—';
  const cleaned = name
    .trim()
    .replace(/^(dr\.?|doctor)\s+/i, '')
    .trim();
  if (!cleaned) return '—';
  return `Dr. ${cleaned}`;
}
