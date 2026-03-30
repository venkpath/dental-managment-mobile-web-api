import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the bottom safe area inset (accounts for software nav buttons).
 * Use this to add paddingBottom to scrollable screens with buttons at the bottom.
 */
export const useBottomInset = () => {
  const insets = useSafeAreaInsets();
  return insets.bottom;
};
