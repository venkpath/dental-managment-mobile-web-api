"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBookingShortCode = generateBookingShortCode;
exports.getShortBookingUrl = getShortBookingUrl;
exports.getBookingUrl = getBookingUrl;
const crypto_1 = require("crypto");
const BOOKING_BASE_URL = 'https://www.smartdentaldesk.com/booking';
const SHORT_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
function generateBookingShortCode() {
    const bytes = (0, crypto_1.randomBytes)(8);
    return Array.from(bytes).map((b) => SHORT_CODE_CHARS[b % SHORT_CODE_CHARS.length]).join('');
}
function getShortBookingUrl(shortCode) {
    return `${BOOKING_BASE_URL}/${shortCode}`;
}
function getBookingUrl(clinicId, branchId, bookNowUrl) {
    if (bookNowUrl)
        return bookNowUrl;
    return `${BOOKING_BASE_URL}/${clinicId}/${branchId}`;
}
//# sourceMappingURL=booking-url.util.js.map