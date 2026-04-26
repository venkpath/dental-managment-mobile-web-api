export declare const CURRENCY_SYMBOLS: Record<string, string>;
export declare const CURRENCY_SYMBOLS_PDF_SAFE: Record<string, string>;
export declare const CURRENCY_LOCALES: Record<string, string>;
export declare function getCurrencySymbol(code: string): string;
export declare function getCurrencySymbolPdfSafe(code: string): string;
export declare function getCurrencyLocale(code: string): string;
export declare function formatCurrencyAmount(amount: number, currencyCode: string): string;
export declare function formatCurrencyAmountPdfSafe(amount: number, currencyCode: string): string;
