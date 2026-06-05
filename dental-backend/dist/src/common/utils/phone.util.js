"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phoneLookupVariants = phoneLookupVariants;
exports.normalizePhoneE164 = normalizePhoneE164;
function phoneLookupVariants(phone) {
    const trimmed = phone.trim();
    const digits = trimmed.replace(/[^0-9]/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const variants = [trimmed];
    if (last10.length >= 7) {
        variants.push(last10, `+91${last10}`, `91${last10}`);
        if (digits !== last10)
            variants.push(digits);
    }
    return [...new Set(variants.filter((v) => v.length >= 7))];
}
function normalizePhoneE164(phone) {
    const trimmed = phone.trim();
    if (!trimmed)
        return null;
    if (/^\+[1-9]\d{6,14}$/.test(trimmed))
        return trimmed;
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (digits.length === 10)
        return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91'))
        return `+${digits}`;
    if (digits.length > 10)
        return `+${digits}`;
    return null;
}
//# sourceMappingURL=phone.util.js.map