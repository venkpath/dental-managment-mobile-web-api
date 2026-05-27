import { Injectable, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID, timingSafeEqual } from 'crypto';

const OTP_TTL_SECONDS = 10 * 60;       // 10 min — OTP validity window
const TOKEN_TTL_SECONDS = 30 * 60;     // 30 min — verified booking token validity
const MAX_SEND_ATTEMPTS = 5;           // OTP sends per window
const MAX_VERIFY_ATTEMPTS = 10;        // wrong guesses before lockout

@Injectable()
export class OtpService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('redis.host', 'localhost'),
      port: config.get<number>('redis.port', 6379),
      password: config.get<string>('redis.password'),
      tls: config.get<boolean>('redis.tls') ? {} : undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  // ─── Key helpers ─────────────────────────────────────────────────────

  private otpKey(clinicId: string, phone: string) {
    return `otp:code:${clinicId}:${phone}`;
  }

  private sendAttemptsKey(clinicId: string, phone: string) {
    return `otp:send_attempts:${clinicId}:${phone}`;
  }

  private verifyAttemptsKey(clinicId: string, phone: string) {
    return `otp:verify_attempts:${clinicId}:${phone}`;
  }

  private tokenKey(token: string) {
    return `otp:token:${token}`;
  }

  // ─── Public API ───────────────────────────────────────────────────────

  /**
   * Generate and store a new OTP. Enforces a send-rate limit:
   * max 5 sends within any rolling 10-minute window.
   * Returns the OTP so the caller can deliver it.
   */
  async generateAndStore(clinicId: string, phone: string): Promise<string> {
    const attKey = this.sendAttemptsKey(clinicId, phone);

    // Increment first, then check — so the counter always reflects reality.
    const attempts = await this.redis.incr(attKey);
    if (attempts === 1) {
      // First send in a new window — set the TTL.
      await this.redis.expire(attKey, OTP_TTL_SECONDS);
    }

    if (attempts > MAX_SEND_ATTEMPTS) {
      throw new BadRequestException('Too many OTP requests. Please wait a few minutes and try again.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store the OTP with its own TTL (resets if resent within window).
    await this.redis.set(this.otpKey(clinicId, phone), otp, 'EX', OTP_TTL_SECONDS);
    // Clear any leftover verify-attempt counter from a previous OTP cycle.
    await this.redis.del(this.verifyAttemptsKey(clinicId, phone));

    return otp;
  }

  /**
   * Verify an OTP using a constant-time comparison.
   * Enforces brute-force protection: max 10 wrong guesses before lockout.
   * On success, deletes the OTP and returns a single-use booking token.
   */
  async verify(clinicId: string, phone: string, otp: string): Promise<string> {
    const vaKey = this.verifyAttemptsKey(clinicId, phone);
    const verifyAttempts = await this.redis.incr(vaKey);
    if (verifyAttempts === 1) {
      await this.redis.expire(vaKey, OTP_TTL_SECONDS);
    }

    if (verifyAttempts > MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    const stored = await this.redis.get(this.otpKey(clinicId, phone));
    if (!stored) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const paddedStored = stored.padEnd(otp.length, '\0');
    const paddedOtp = otp.padEnd(stored.length, '\0');
    const match =
      stored.length === otp.length &&
      timingSafeEqual(Buffer.from(paddedStored), Buffer.from(paddedOtp));

    if (!match) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    // Clean up OTP and verify attempts — one-time use.
    await this.redis.del(
      this.otpKey(clinicId, phone),
      this.verifyAttemptsKey(clinicId, phone),
    );

    // Issue a short-lived single-use booking token.
    const token = randomUUID();
    await this.redis.set(
      this.tokenKey(token),
      `${clinicId}:${phone}`,
      'EX',
      TOKEN_TTL_SECONDS,
    );

    return token;
  }

  /**
   * Consume a booking token (single-use). Returns true if valid, false otherwise.
   */
  async consumeToken(token: string, clinicId: string, phone: string): Promise<boolean> {
    const key = this.tokenKey(token);
    const stored = await this.redis.get(key);
    if (!stored || stored !== `${clinicId}:${phone}`) return false;
    await this.redis.del(key);
    return true;
  }
}
