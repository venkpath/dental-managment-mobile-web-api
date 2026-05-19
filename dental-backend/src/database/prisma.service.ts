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
  private keepAliveTimer?: NodeJS.Timeout;

  constructor() {
    // Tuned for Neon Postgres:
    // - Neon auto-suspends the compute endpoint after ~5 min of total idle on
    //   free/launch tiers. Each fresh connection on a suspended endpoint then
    //   waits 5–30s for compute to wake. The previous config (min: 0,
    //   idleTimeoutMillis: 10_000, allowExitOnIdle: true) tore the pool down
    //   after just 10s of app idle, so every "first request" after a quiet
    //   moment paid the wake-up cost AND a fresh TLS/auth round trip.
    // - min: 2 keeps two warm sockets so the next request reuses them.
    // - idleTimeoutMillis: 4 min stays just under Neon's 5-min suspend window
    //   so the keep-alive ping (added below) recycles the connection before
    //   Neon tears it down server-side.
    // - allowExitOnIdle: false prevents the pool from fully dying during a
    //   lull (which would force a from-scratch reconnect on the next request).
    const pool = new pg.Pool({
      connectionString: process.env['DATABASE_URL'],
      min: 2,
      max: 10,
      idleTimeoutMillis: 240_000,
      allowExitOnIdle: false,
      keepAlive: true,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');
    await this.$connect();
    // Force-open the configured minimum sockets right at boot so the first
    // real user request finds warm connections (instead of paying the cold
    // TCP + TLS + Postgres-auth + possible Neon-wake cost itself).
    try {
      await Promise.all([
        this.$queryRawUnsafe('SELECT 1'),
        this.$queryRawUnsafe('SELECT 1'),
      ]);
    } catch (err) {
      this.logger.warn(`Warmup query failed (non-fatal): ${(err as Error).message}`);
    }
    this.logger.log('Database connection established');

    // Periodic keep-alive: hit the DB every 4 minutes so Neon never sees a
    // full idle window long enough to suspend the compute endpoint, and so
    // the pool's idle sockets stay hot. Cheap (`SELECT 1`) and runs in the
    // backend process — no external cron needed.
    this.keepAliveTimer = setInterval(() => {
      this.$queryRawUnsafe('SELECT 1').catch((err) => {
        this.logger.warn(`Keep-alive ping failed: ${(err as Error).message}`);
      });
    }, 4 * 60 * 1000);
    // Don't let this timer hold the process open on shutdown.
    if (typeof this.keepAliveTimer.unref === 'function') {
      this.keepAliveTimer.unref();
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = undefined;
    }
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database connection closed');
  }
}
