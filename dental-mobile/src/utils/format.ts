import { useCurrencyStore } from '../store/currency.store';

export function formatCurrency(amount: number): string {
  const { locale, code } = useCurrencyStore.getState();
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const { symbol } = useCurrencyStore.getState();
    return `${symbol}${amount.toFixed(2)}`;
  }
}

export function getLocale(): string {
  return useCurrencyStore.getState().locale;
}

export function getCurrencySymbol(): string {
  return useCurrencyStore.getState().symbol;
}
