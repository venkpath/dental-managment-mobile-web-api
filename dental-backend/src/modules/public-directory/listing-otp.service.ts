import { BadRequestException, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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

interface MemOtpEntry {
  code: string;
  expiresAt: number;
  verifyAttempts: number;
}

@Injectable()
export class ListingOtpService implements OnModuleDestroy {
  private readonly logger = new Logger(ListingOtpService.name);
  private readonly redis: Redis;
  /** Fallback when Redis is temporarily unavailable (single-process only). */
  private readonly memPhone = new Map<string, MemOtpEntry>();
  private readonly memEmail = new Map<string, MemOtpEntry>();

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('redis.host', 'localhost'),
      port: config.get<number>('redis.port', 6379),
      password: config.get<string>('redis.password'),
      tls: config.get<boolean>('redis.tls') ? {} : undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`Listing OTP Redis error: ${err.message}`);
    });
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

  private async redisAvailable(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  async assertPhoneSendAllowed(phone: string): Promise<string> {
    const key = this.normalizePhoneKey(phone);
    if (await this.redisAvailable()) {
      const sendKey = this.phoneSendKey(key);
      const count = await this.redis.incr(sendKey);
      if (count === 1) await this.redis.expire(sendKey, PHONE_SEND_WINDOW_SECONDS);
      if (count > MAX_PHONE_SENDS_PER_HOUR) {
        throw new BadRequestException(
          'Too many OTP requests for this number. Please try again after an hour.',
        );
      }
      return key;
    }
    this.logger.warn('Redis unavailable — using in-memory listing phone OTP store');
    return key;
  }

  async assertEmailSendAllowed(email: string): Promise<string> {
    const key = this.normalizeEmailKey(email);
    if (await this.redisAvailable()) {
      const sendKey = this.emailSendKey(key);
      const count = await this.redis.incr(sendKey);
      if (count === 1) await this.redis.expire(sendKey, EMAIL_SEND_WINDOW_SECONDS);
      if (count > MAX_EMAIL_SENDS_PER_WINDOW) {
        throw new BadRequestException(
          'Too many OTP requests for this email. Please wait a few minutes and try again.',
        );
      }
      return key;
    }
    this.logger.warn('Redis unavailable — using in-memory listing email OTP store');
    return key;
  }

  /** Undo a send attempt when delivery failed so the user can retry without burning quota. */
  async rollbackEmailSend(emailKey: string): Promise<void> {
    if (!(await this.redisAvailable())) return;
    const sendKey = this.emailSendKey(emailKey);
    const count = await this.redis.decr(sendKey);
    if (count <= 0) await this.redis.del(sendKey);
  }

  async storePhoneOtp(phoneKey: string, otp: string): Promise<void> {
    if (await this.redisAvailable()) {
      await this.redis.set(this.phoneOtpKey(phoneKey), otp, 'EX', OTP_TTL_SECONDS);
      await this.redis.del(this.phoneVerifyKey(phoneKey));
      return;
    }
    this.memPhone.set(phoneKey, {
      code: otp,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
      verifyAttempts: 0,
    });
  }

  async storeEmailOtp(emailKey: string, otp: string): Promise<void> {
    if (await this.redisAvailable()) {
      await this.redis.set(this.emailOtpKey(emailKey), otp, 'EX', OTP_TTL_SECONDS);
      await this.redis.del(this.emailVerifyKey(emailKey));
      return;
    }
    this.memEmail.set(emailKey, {
      code: otp,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
      verifyAttempts: 0,
    });
  }

  async verifyPhoneOtp(phoneKey: string, code: string): Promise<void> {
    if (await this.redisAvailable()) {
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
      return;
    }

    const entry = this.memPhone.get(phoneKey);
    if (!entry || Date.now() > entry.expiresAt) {
      this.memPhone.delete(phoneKey);
      throw new BadRequestException('OTP not found or expired. Please request a new one.');
    }
    if (entry.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      this.memPhone.delete(phoneKey);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }
    if (!this.codesMatch(entry.code, code)) {
      entry.verifyAttempts++;
      throw new BadRequestException('Invalid OTP. Please try again.');
    }
    this.memPhone.delete(phoneKey);
  }

  async verifyEmailOtp(emailKey: string, code: string): Promise<void> {
    if (await this.redisAvailable()) {
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
      return;
    }

    const entry = this.memEmail.get(emailKey);
    if (!entry || Date.now() > entry.expiresAt) {
      this.memEmail.delete(emailKey);
      throw new BadRequestException('OTP not found or expired. Please request a new one.');
    }
    if (entry.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      this.memEmail.delete(emailKey);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }
    if (!this.codesMatch(entry.code, code)) {
      entry.verifyAttempts++;
      throw new BadRequestException('Invalid OTP. Please try again.');
    }
    this.memEmail.delete(emailKey);
  }
}
