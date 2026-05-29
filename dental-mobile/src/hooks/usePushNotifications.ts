import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/auth.store';
import { useNotificationStore } from '../store/notification.store';
import { notificationsService } from '../services/notifications.service';
import { navigateFromNotificationData } from '../utils/notificationNavigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Appointments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

async function resolveExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  await ensureAndroidChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

/**
 * Registers Expo push token with the API and wires notification listeners.
 * Call once when the user is authenticated.
 */
export function usePushNotifications(enabled: boolean): void {
  const pushTokenRef = useRef<string | null>(null);
  const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount);

  useEffect(() => {
    if (!enabled) return;

    let responseSub: Notifications.EventSubscription | undefined;
    let receivedSub: Notifications.EventSubscription | undefined;

    const setup = async () => {
      refreshUnreadCount();

      const token = await resolveExpoPushToken();
      if (token) {
        pushTokenRef.current = token;
        const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : undefined;
        try {
          await notificationsService.registerPushToken(token, platform);
        } catch {
          // API may be unavailable in dev
        }
      }

      receivedSub = Notifications.addNotificationReceivedListener(() => {
        refreshUnreadCount();
      });

      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        navigateFromNotificationData(data);
        refreshUnreadCount();
      });

      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        const data = last.notification.request.content.data as Record<string, unknown> | undefined;
        navigateFromNotificationData(data);
      }
    };

    setup();

    return () => {
      responseSub?.remove();
      receivedSub?.remove();
    };
  }, [enabled, refreshUnreadCount]);

  useEffect(() => {
    if (enabled) return;
    const token = pushTokenRef.current;
    if (token) {
      notificationsService.unregisterPushToken(token).catch(() => {});
      pushTokenRef.current = null;
    }
  }, [enabled]);
}
