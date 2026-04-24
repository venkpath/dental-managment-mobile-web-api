import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', locale: 'ka-GE' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', locale: 'ar-AE' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', locale: 'en-CA' },
];

const CURRENCY_KEY = 'dental-currency-storage';

interface CurrencyState extends CurrencyConfig {
  setCurrency: (code: string) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  code: 'INR',
  name: 'Indian Rupee',
  symbol: '₹',
  locale: 'en-IN',
  setCurrency: async (code: string) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    if (!found) return;
    set(found);
    await AsyncStorage.setItem(CURRENCY_KEY, JSON.stringify(found));
  },
}));

export const loadCurrencyFromStorage = async () => {
  try {
    const raw = await AsyncStorage.getItem(CURRENCY_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.code) useCurrencyStore.setState(data);
  } catch {}
};
