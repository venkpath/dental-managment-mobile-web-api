import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY, type CountryDial } from './countryCodes';

const DIAL_SORTED = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);

/** Split stored E.164 / local phone into country + national digits. */
export function parseStoredPhone(phone: string): { country: CountryDial; local: string } {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return { country: DEFAULT_COUNTRY, local: '' };
  for (const c of DIAL_SORTED) {
    if (digits.startsWith(c.dial)) {
      return { country: c, local: digits.slice(c.dial.length) };
    }
  }
  if (digits.length === 10) return { country: DEFAULT_COUNTRY, local: digits };
  return { country: DEFAULT_COUNTRY, local: digits };
}

export function isValidPhoneForCountry(local: string, country: CountryDial): boolean {
  const digits = local.replace(/\D/g, '');
  return digits.length >= country.minLength && digits.length <= country.maxLength;
}

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

/** Build E.164 from country dial code + national number. */
export function toE164FromCountry(local: string, country: CountryDial): string {
  const digits = local.replace(/\D/g, '');
  return `+${country.dial}${digits}`;
}
