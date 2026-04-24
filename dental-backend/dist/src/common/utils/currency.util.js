"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_LOCALES = exports.CURRENCY_SYMBOLS = void 0;
exports.getCurrencySymbol = getCurrencySymbol;
exports.getCurrencyLocale = getCurrencyLocale;
exports.formatCurrencyAmount = formatCurrencyAmount;
exports.CURRENCY_SYMBOLS = {
    INR: '\u20B9',
    USD: '$',
    EUR: '\u20AC',
    GBP: '\u00A3',
    GEL: '\u20BE',
    AED: 'AED',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
};
exports.CURRENCY_LOCALES = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    GEL: 'ka-GE',
    AED: 'ar-AE',
    SGD: 'en-SG',
    AUD: 'en-AU',
    CAD: 'en-CA',
};
function getCurrencySymbol(code) {
    return exports.CURRENCY_SYMBOLS[code] ?? code;
}
function getCurrencyLocale(code) {
    return exports.CURRENCY_LOCALES[code] ?? 'en-US';
}
function formatCurrencyAmount(amount, currencyCode) {
    const symbol = getCurrencySymbol(currencyCode);
    const locale = getCurrencyLocale(currencyCode);
    try {
        return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    catch {
        return `${symbol}${amount.toFixed(2)}`;
    }
}
//# sourceMappingURL=currency.util.js.map