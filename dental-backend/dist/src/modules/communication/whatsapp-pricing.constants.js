"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WHATSAPP_OVERAGE_PRICE_INR = void 0;
exports.normalizeWhatsAppCategory = normalizeWhatsAppCategory;
exports.priceForCategory = priceForCategory;
exports.mapInternalCategoryToWa = mapInternalCategoryToWa;
exports.WHATSAPP_OVERAGE_PRICE_INR = Object.freeze({
    UTILITY: 0.4,
    MARKETING: 1.0,
    AUTHENTICATION: 0.3,
});
const VALID_CATEGORIES = new Set(['UTILITY', 'MARKETING', 'AUTHENTICATION']);
function normalizeWhatsAppCategory(raw) {
    if (!raw)
        return 'UTILITY';
    const upper = raw.toUpperCase();
    if (upper === 'OTP')
        return 'AUTHENTICATION';
    return (VALID_CATEGORIES.has(upper) ? upper : 'UTILITY');
}
function priceForCategory(category, count) {
    if (count <= 0)
        return 0;
    return Math.round(count * exports.WHATSAPP_OVERAGE_PRICE_INR[category] * 100) / 100;
}
function mapInternalCategoryToWa(internalCategory) {
    if (!internalCategory)
        return 'UTILITY';
    const c = internalCategory.toLowerCase();
    if (c === 'campaign' || c === 'greeting' || c === 'referral')
        return 'MARKETING';
    return 'UTILITY';
}
//# sourceMappingURL=whatsapp-pricing.constants.js.map