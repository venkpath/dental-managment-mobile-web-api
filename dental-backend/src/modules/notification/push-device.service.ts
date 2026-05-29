import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto.js';

@Injectable()
export class PushDeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterPushTokenDto): Promise<void> {
    await this.prisma.pushDeviceToken.upsert({
      where: { token: dto.token },
      create: {
        user_id: userId,
        token: dto.token,
        platform: dto.platform ?? null,
        device_id: dto.device_id ?? null,
      },
      update: {
        user_id: userId,
        platform: dto.platform ?? null,
        device_id: dto.device_id ?? null,
        updated_at: new Date(),
      },
    });
  }

  async unregister(userId: string, token: string): Promise<void> {
    await this.prisma.pushDeviceToken.deleteMany({
      where: { user_id: userId, token },
    });
  }

  async unregisterAllForUser(userId: string): Promise<void> {
    await this.prisma.pushDeviceToken.deleteMany({
      where: { user_id: userId },
    });
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.pushDeviceToken.findMany({
      where: { user_id: userId },
      select: { token: true },
    });
    return rows.map((r) => r.token);
  }
}
