import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { timingSafeEqual } from 'crypto';
import { normalizePhoneE164 } from '../../common/utils/phone.util.js';

const OTP_TTL_SECONDS = 10 * 60;
const PHONE_SEND_WINDOW_SECONDS = 60 * 60;
const MAX_PHONE_SENDS_PER_HOUR = 3;
const EMAIL_SEND_WINDOW_SECONDS = 10 * 60;
const MAX_EMAIL_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const REDIS_RETRY_DELAYS_MS = [0, 300, 800, 2000];

@Injectable()
export class ListingOtpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingOtpService.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('redis.host', 'localhost'),
      port: config.get<number>('redis.port', 6379),
      password: config.get<string>('redis.password') || undefined,
      tls: config.get<boolean>('redis.tls') ? {} : undefined,
      connectTimeout: 20_000,
      keepAlive: 30_000,
      maxRetriesPerRequest: 5,
      enableOfflineQueue: false,
      lazyConnect: false,
      retryStrategy: (times) => (times > 10 ? null : Math.min(times * 400, 4_000)),
    });
    this.redis.on('error', (err) => {
      this.logger.error(`Listing OTP Redis error: ${err.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.withRedis('startup ping', () => this.redis.ping());
      this.logger.log('Listing OTP store ready (Redis)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Listing OTP Redis not reachable at startup: ${msg}`);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }

  normalizePhoneKey(phone: string): string {
    return normalizePhoneE164(phone) ?? phone.trim().replace(/[^0-9]/g, '').slice(-10);
  }

  normalizeEmailKey(email: string): string {
    return email.trim().toLowerCase();
  }

  private phoneOtpKey(phoneKey: string) {
    return `listing:otp:phone:${phoneKey}`;
  }

  private emailOtpKey(emailKey: string) {
    return `listing:otp:email:${emailKey}`;
  }

  private phoneSendKey(phoneKey: string) {
    return `listing:otp:phone:send:${phoneKey}`;
  }

  private emailSendKey(emailKey: string) {
    return `listing:otp:email:send:${emailKey}`;
  }

  private phoneVerifyKey(phoneKey: string) {
    return `listing:otp:phone:verify:${phoneKey}`;
  }

  private emailVerifyKey(emailKey: string) {
    return `listing:otp:email:verify:${emailKey}`;
  }

  private codesMatch(stored: string, submitted: string): boolean {
    const a = stored.trim();
    const b = submitted.trim();
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * All OTP data lives in Redis so every PM2 worker shares the same codes.
   * Retries brief connection blips instead of falling back to per-process memory.
   */
  private async withRedis<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let lastErr: Error | undefined;
    for (const delay of REDIS_RETRY_DELAYS_MS) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      try {
        return await fn();
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`Redis ${label} failed: ${lastErr.message}`);
      }
    }
    this.logger.error(`Redis ${label} exhausted retries: ${lastErr?.message}`);
    throw new ServiceUnavailableException(
      'Verification service is temporarily unavailable. Please try again.',
    );
  }

  async assertPhoneSendAllowed(phone: string): Promise<string> {
    const key = this.normalizePhoneKey(phone);
    await this.withRedis('phone send limit', async () => {
      const sendKey = this.phoneSendKey(key);
      const count = await this.redis.incr(sendKey);
      if (count === 1) await this.redis.expire(sendKey, PHONE_SEND_WINDOW_SECONDS);
      if (count > MAX_PHONE_SENDS_PER_HOUR) {
        throw new BadRequestException(
          'Too many OTP requests for this number. Please try again after an hour.',
        );
      }
    });
    return key;
  }

  async assertEmailSendAllowed(email: string): Promise<string> {
    const key = this.normalizeEmailKey(email);
    await this.withRedis('email send limit', async () => {
      const sendKey = this.emailSendKey(key);
      const count = await this.redis.incr(sendKey);
      if (count === 1) await this.redis.expire(sendKey, EMAIL_SEND_WINDOW_SECONDS);
      if (count > MAX_EMAIL_SENDS_PER_WINDOW) {
        throw new BadRequestException(
          'Too many OTP requests for this email. Please wait a few minutes and try again.',
        );
      }
    });
    return key;
  }

  async rollbackPhoneSend(phoneKey: string): Promise<void> {
    await this.withRedis('rollback phone send', async () => {
      const sendKey = this.phoneSendKey(phoneKey);
      const count = await this.redis.decr(sendKey);
      if (count <= 0) await this.redis.del(sendKey);
    }).catch(() => {});
  }

  async rollbackEmailSend(emailKey: string): Promise<void> {
    await this.withRedis('rollback email send', async () => {
      const sendKey = this.emailSendKey(emailKey);
      const count = await this.redis.decr(sendKey);
      if (count <= 0) await this.redis.del(sendKey);
    }).catch(() => {});
  }

  async storePhoneOtp(phoneKey: string, otp: string): Promise<void> {
    await this.withRedis('store phone otp', async () => {
      await this.redis.set(this.phoneOtpKey(phoneKey), otp, 'EX', OTP_TTL_SECONDS);
      await this.redis.del(this.phoneVerifyKey(phoneKey));
    });
  }

  async storeEmailOtp(emailKey: string, otp: string): Promise<void> {
    await this.withRedis('store email otp', async () => {
      await this.redis.set(this.emailOtpKey(emailKey), otp, 'EX', OTP_TTL_SECONDS);
      await this.redis.del(this.emailVerifyKey(emailKey));
    });
  }

  async verifyPhoneOtp(phoneKey: string, code: string): Promise<void> {
    await this.withRedis('verify phone otp', async () => {
      const verifyKey = this.phoneVerifyKey(phoneKey);
      const attempts = await this.redis.incr(verifyKey);
      if (attempts === 1) await this.redis.expire(verifyKey, OTP_TTL_SECONDS);
      if (attempts > MAX_VERIFY_ATTEMPTS) {
        await this.redis.del(this.phoneOtpKey(phoneKey), verifyKey);
        throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
      }
      const stored = await this.redis.get(this.phoneOtpKey(phoneKey));
      if (!stored) {
        throw new BadRequestException('OTP not found or expired. Please request a new one.');
      }
      if (!this.codesMatch(stored, code)) {
        throw new BadRequestException('Invalid OTP. Please try again.');
      }
      await this.redis.del(this.phoneOtpKey(phoneKey), verifyKey);
    });
  }

  async verifyEmailOtp(emailKey: string, code: string): Promise<void> {
    await this.withRedis('verify email otp', async () => {
      const verifyKey = this.emailVerifyKey(emailKey);
      const attempts = await this.redis.incr(verifyKey);
      if (attempts === 1) await this.redis.expire(verifyKey, OTP_TTL_SECONDS);
      if (attempts > MAX_VERIFY_ATTEMPTS) {
        await this.redis.del(this.emailOtpKey(emailKey), verifyKey);
        throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
      }
      const stored = await this.redis.get(this.emailOtpKey(emailKey));
      if (!stored) {
        throw new BadRequestException('OTP not found or expired. Please request a new one.');
      }
      if (!this.codesMatch(stored, code)) {
        throw new BadRequestException('Invalid OTP. Please try again.');
      }
      await this.redis.del(this.emailOtpKey(emailKey), verifyKey);
    });
  }
}
