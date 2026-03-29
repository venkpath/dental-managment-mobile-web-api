"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingUrl = getBookingUrl;
const BOOKING_BASE_URL = 'https://www.smartdentaldesk.com/booking';
function getBookingUrl(clinicId, branchId, bookNowUrl) {
    if (bookNowUrl)
        return bookNowUrl;
    return `${BOOKING_BASE_URL}/${clinicId}/${branchId}`;
}
//# sourceMappingURL=booking-url.util.js.map