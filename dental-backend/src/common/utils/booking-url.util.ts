import { randomBytes } from 'crypto';

const BOOKING_BASE_URL = 'https://www.smartdentaldesk.com/booking';
const SHORT_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateBookingShortCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes).map((b) => SHORT_CODE_CHARS[b % SHORT_CODE_CHARS.length]).join('');
}

export function getShortBookingUrl(shortCode: string): string {
  return `${BOOKING_BASE_URL}/${shortCode}`;
}

/**
 * Returns the effective booking URL for a branch.
 * Priority: short code > branch.book_now_url > smartdentaldesk.com/booking/{clinicId}/{branchId}
 */
export function getBookingUrl(clinicId: string, branchId: string, bookNowUrl?: string | null): string {
  if (bookNowUrl) return bookNowUrl;
  return `${BOOKING_BASE_URL}/${clinicId}/${branchId}`;
}
