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

/**
 * Strip any leading "Dr." / "Doctor" prefix and return just the bare name.
 * Used when a downstream template body already includes a literal "Dr."
 * (e.g. an approved Meta WhatsApp template) so we don't duplicate it.
 */
export function stripDoctorPrefix(name?: string | null): string {
  if (!name) return '';
  return name.trim().replace(/^(dr\.?|doctor)\s+/i, '').trim();
}
