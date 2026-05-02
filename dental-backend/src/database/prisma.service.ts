import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: pg.Pool;

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env['DATABASE_URL'],
      min: 0,
      idleTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database connection closed');
  }
}
