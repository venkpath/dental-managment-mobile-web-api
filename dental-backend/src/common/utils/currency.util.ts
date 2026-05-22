// Maps currency codes to symbols and locales for backend formatting
export const CURRENCY_SYMBOLS: Record<string, string> = {
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

/**
 * ASCII-safe symbols for use in PDFs that rely on PDFKit's standard fonts
 * (Helvetica, etc.). Those fonts use WinAnsi encoding and DO NOT contain
 * glyphs for ₹ (U+20B9) or ₾ (U+20BE), so we substitute readable ASCII.
 * Symbols already supported by WinAnsi (€, £, $) are kept as-is.
 */
export const CURRENCY_SYMBOLS_PDF_SAFE: Record<string, string> = {
  INR: 'Rs.',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  GEL: 'GEL',
  AED: 'AED',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
};

// Formatting locale used for numbers and dates on invoices.
// We deliberately use English variants for currencies whose native locale
// produces comma-decimals or non-Latin date glyphs that PDFKit's standard
// fonts can't render — e.g. de-DE → "1.500,00", ka-GE → "22 ი ი ი. 2026".
// English variants (en-IE for EUR, en-US for GEL, en-AE for AED) keep the
// correct currency symbol while giving us dot-decimals and Latin dates.
export const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  GEL: 'en-US',
  AED: 'en-AE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  CAD: 'en-CA',
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function getCurrencySymbolPdfSafe(code: string): string {
  return CURRENCY_SYMBOLS_PDF_SAFE[code] ?? code;
}

export function getCurrencyLocale(code: string): string {
  return CURRENCY_LOCALES[code] ?? 'en-US';
}

export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const locale = getCurrencyLocale(currencyCode);
  try {
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Same as formatCurrencyAmount but uses ASCII-safe symbols suitable for PDFKit's
 * standard fonts (which lack ₹ and ₾ glyphs).
 */
export function formatCurrencyAmountPdfSafe(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbolPdfSafe(currencyCode);
  const locale = getCurrencyLocale(currencyCode);
  // Add a thin space after multi-char symbols (Rs., GEL, AED) for readability
  const sep = symbol.length > 1 ? ' ' : '';
  try {
    return `${symbol}${sep}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `${symbol}${sep}${amount.toFixed(2)}`;
  }
}
