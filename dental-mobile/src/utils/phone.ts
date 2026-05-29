/** Normalize Indian/local input to E.164 (e.g. +919876543210). */
export function toE164Phone(input: string, defaultCountryCode = '91'): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    return `+${digits}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length > 10 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  return `+${defaultCountryCode}${digits}`;
}
