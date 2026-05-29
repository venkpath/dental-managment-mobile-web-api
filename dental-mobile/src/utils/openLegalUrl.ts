import { Alert, Linking } from 'react-native';
import { LEGAL_URLS, SUPPORT_MAILTO, type LegalLinkKind } from '../constants/legal';

export async function openLegalUrl(kind: LegalLinkKind): Promise<void> {
  const url = LEGAL_URLS[kind];
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Cannot open link', url);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Error', 'Could not open the page in your browser.');
  }
}

export async function openSupportEmail(): Promise<void> {
  try {
    await Linking.openURL(SUPPORT_MAILTO);
  } catch {
    Alert.alert('Contact', SUPPORT_MAILTO.replace('mailto:', ''));
  }
}
