import { Injectable, Logger } from '@nestjs/common';
import { PushDeviceService } from './push-device.service.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly pushDeviceService: PushDeviceService) {}

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await this.pushDeviceService.getTokensForUser(userId);
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'appointments',
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Expo push HTTP ${res.status} for user ${userId}: ${text}`);
        return;
      }

      const result = (await res.json()) as { data?: Array<{ status: string; message?: string; details?: unknown }> };
      const tickets = result.data ?? [];
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket?.status === 'error') {
          this.logger.warn(
            `Expo push error for user ${userId} token[${i}]: ${ticket.message ?? 'unknown'}`,
          );
        }
      }
    } catch (e) {
      this.logger.warn(`Expo push failed for user ${userId}: ${(e as Error).message}`);
    }
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    const unique = [...new Set(userIds)];
    await Promise.all(unique.map((id) => this.sendToUser(id, payload)));
  }
}
