import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  check(): { status: string } {
    return { status: 'ok' };
  }

  async checkDetailed(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database connectivity
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
      // Memory - heap should be under 256 MB
      () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024),
      // Memory - RSS under 512 MB
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
      // Disk - at least 10% free space
      () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
    ]);
  }

  async checkReady(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
    ]);
  }
}
