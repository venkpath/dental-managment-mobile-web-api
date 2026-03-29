const BOOKING_BASE_URL = 'https://www.smartdentaldesk.com/booking';

/**
 * Returns the effective booking URL for a branch.
 * Priority: branch.book_now_url > smartdentaldesk.com/booking/{clinicId}/{branchId}
 */
export function getBookingUrl(clinicId: string, branchId: string, bookNowUrl?: string | null): string {
  if (bookNowUrl) return bookNowUrl;
  return `${BOOKING_BASE_URL}/${clinicId}/${branchId}`;
}
