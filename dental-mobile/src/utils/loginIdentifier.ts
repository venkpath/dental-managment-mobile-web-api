import { toE164Phone } from './phone';

const E164_RE = /^\+[1-9]\d{6,14}$/;
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

/** True if the user input should be treated as a phone login (matches web login). */
export function isPhoneLoginIdentifier(value: string): boolean {
  const t = value.trim();
  return E164_RE.test(t) || INDIAN_MOBILE_RE.test(t);
}

export type ParsedLoginIdentifier =
  | { isPhone: true; phone: string }
  | { isPhone: false; email: string };

export function parseLoginIdentifier(value: string): ParsedLoginIdentifier {
  const trimmed = value.trim();
  if (isPhoneLoginIdentifier(trimmed)) {
    return { isPhone: true, phone: toE164Phone(trimmed) };
  }
  return { isPhone: false, email: trimmed.toLowerCase() };
}

export function validateLoginIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Email or phone number is required';

  if (isPhoneLoginIdentifier(trimmed)) {
    const phone = toE164Phone(trimmed);
    if (!E164_RE.test(phone)) {
      return 'Enter a valid phone with country code (e.g. +919876543210)';
    }
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address';
  }
  return null;
}
