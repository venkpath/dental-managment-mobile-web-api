import { create } from 'zustand';
import { notificationsService } from '../services/notifications.service';

interface NotificationStore {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnread: () => void;
  clearUnread: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,

  refreshUnreadCount: async () => {
    try {
      const count = await notificationsService.unreadCount();
      set({ unreadCount: count });
    } catch {
      // keep last known count
    }
  },

  decrementUnread: () => {
    const n = get().unreadCount;
    if (n > 0) set({ unreadCount: n - 1 });
  },

  clearUnread: () => set({ unreadCount: 0 }),
}));
