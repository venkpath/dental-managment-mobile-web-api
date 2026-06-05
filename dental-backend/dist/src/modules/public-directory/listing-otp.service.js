"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ListingOtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingOtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const phone_util_js_1 = require("../../common/utils/phone.util.js");
const OTP_TTL_SECONDS = 10 * 60;
const PHONE_SEND_WINDOW_SECONDS = 60 * 60;
const MAX_PHONE_SENDS_PER_HOUR = 3;
const EMAIL_SEND_WINDOW_SECONDS = 10 * 60;
const MAX_EMAIL_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const REDIS_RETRY_DELAYS_MS = [0, 300, 800, 2000];
let ListingOtpService = ListingOtpService_1 = class ListingOtpService {
    logger = new common_1.Logger(ListingOtpService_1.name);
    redis;
    constructor(config) {
        this.redis = new ioredis_1.default({
            host: config.get('redis.host', 'localhost'),
            port: config.get('redis.port', 6379),
            password: config.get('redis.password') || undefined,
            tls: config.get('redis.tls') ? {} : undefined,
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Listing OTP Redis not reachable at startup: ${msg}`);
        }
    }
    async onModuleDestroy() {
        await this.redis.quit().catch(() => { });
    }
    normalizePhoneKey(phone) {
        return (0, phone_util_js_1.normalizePhoneE164)(phone) ?? phone.trim().replace(/[^0-9]/g, '').slice(-10);
    }
    normalizeEmailKey(email) {
        return email.trim().toLowerCase();
    }
    phoneOtpKey(phoneKey) {
        return `listing:otp:phone:${phoneKey}`;
    }
    emailOtpKey(emailKey) {
        return `listing:otp:email:${emailKey}`;
    }
    phoneSendKey(phoneKey) {
        return `listing:otp:phone:send:${phoneKey}`;
    }
    emailSendKey(emailKey) {
        return `listing:otp:email:send:${emailKey}`;
    }
    phoneVerifyKey(phoneKey) {
        return `listing:otp:phone:verify:${phoneKey}`;
    }
    emailVerifyKey(emailKey) {
        return `listing:otp:email:verify:${emailKey}`;
    }
    codesMatch(stored, submitted) {
        const a = stored.trim();
        const b = submitted.trim();
        if (a.length !== b.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(Buffer.from(a), Buffer.from(b));
    }
    async withRedis(label, fn) {
        let lastErr;
        for (const delay of REDIS_RETRY_DELAYS_MS) {
            if (delay > 0)
                await new Promise((r) => setTimeout(r, delay));
            try {
                return await fn();
            }
            catch (err) {
                lastErr = err instanceof Error ? err : new Error(String(err));
                this.logger.warn(`Redis ${label} failed: ${lastErr.message}`);
            }
        }
        this.logger.error(`Redis ${label} exhausted retries: ${lastErr?.message}`);
        throw new common_1.ServiceUnavailableException('Verification service is temporarily unavailable. Please try again.');
    }
    async assertPhoneSendAllowed(phone) {
        const key = this.normalizePhoneKey(phone);
        await this.withRedis('phone send limit', async () => {
            const sendKey = this.phoneSendKey(key);
            const count = await this.redis.incr(sendKey);
            if (count === 1)
                await this.redis.expire(sendKey, PHONE_SEND_WINDOW_SECONDS);
            if (count > MAX_PHONE_SENDS_PER_HOUR) {
                throw new common_1.BadRequestException('Too many OTP requests for this number. Please try again after an hour.');
            }
        });
        return key;
    }
    async assertEmailSendAllowed(email) {
        const key = this.normalizeEmailKey(email);
        await this.withRedis('email send limit', async () => {
            const sendKey = this.emailSendKey(key);
            const count = await this.redis.incr(sendKey);
            if (count === 1)
                await this.redis.expire(sendKey, EMAIL_SEND_WINDOW_SECONDS);
            if (count > MAX_EMAIL_SENDS_PER_WINDOW) {
                throw new common_1.BadRequestException('Too many OTP requests for this email. Please wait a few minutes and try again.');
            }
        });
        return key;
    }
    async rollbackPhoneSend(phoneKey) {
        await this.withRedis('rollback phone send', async () => {
            const sendKey = this.phoneSendKey(phoneKey);
            const count = await this.redis.decr(sendKey);
            if (count <= 0)
                await this.redis.del(sendKey);
        }).catch(() => { });
    }
    async rollbackEmailSend(emailKey) {
        await this.withRedis('rollback email send', async () => {
            const sendKey = this.emailSendKey(emailKey);
            const count = await this.redis.decr(sendKey);
            if (count <= 0)
                await this.redis.del(sendKey);
        }).catch(() => { });
    }
    async storePhoneOtp(phoneKey, otp) {
        await this.withRedis('store phone otp', async () => {
            await this.redis.set(this.phoneOtpKey(phoneKey), otp, 'EX', OTP_TTL_SECONDS);
            await this.redis.del(this.phoneVerifyKey(phoneKey));
        });
    }
    async storeEmailOtp(emailKey, otp) {
        await this.withRedis('store email otp', async () => {
            await this.redis.set(this.emailOtpKey(emailKey), otp, 'EX', OTP_TTL_SECONDS);
            await this.redis.del(this.emailVerifyKey(emailKey));
        });
    }
    async verifyPhoneOtp(phoneKey, code) {
        await this.withRedis('verify phone otp', async () => {
            const verifyKey = this.phoneVerifyKey(phoneKey);
            const attempts = await this.redis.incr(verifyKey);
            if (attempts === 1)
                await this.redis.expire(verifyKey, OTP_TTL_SECONDS);
            if (attempts > MAX_VERIFY_ATTEMPTS) {
                await this.redis.del(this.phoneOtpKey(phoneKey), verifyKey);
                throw new common_1.BadRequestException('Too many failed attempts. Please request a new OTP.');
            }
            const stored = await this.redis.get(this.phoneOtpKey(phoneKey));
            if (!stored) {
                throw new common_1.BadRequestException('OTP not found or expired. Please request a new one.');
            }
            if (!this.codesMatch(stored, code)) {
                throw new common_1.BadRequestException('Invalid OTP. Please try again.');
            }
            await this.redis.del(this.phoneOtpKey(phoneKey), verifyKey);
        });
    }
    async verifyEmailOtp(emailKey, code) {
        await this.withRedis('verify email otp', async () => {
            const verifyKey = this.emailVerifyKey(emailKey);
            const attempts = await this.redis.incr(verifyKey);
            if (attempts === 1)
                await this.redis.expire(verifyKey, OTP_TTL_SECONDS);
            if (attempts > MAX_VERIFY_ATTEMPTS) {
                await this.redis.del(this.emailOtpKey(emailKey), verifyKey);
                throw new common_1.BadRequestException('Too many failed attempts. Please request a new OTP.');
            }
            const stored = await this.redis.get(this.emailOtpKey(emailKey));
            if (!stored) {
                throw new common_1.BadRequestException('OTP not found or expired. Please request a new one.');
            }
            if (!this.codesMatch(stored, code)) {
                throw new common_1.BadRequestException('Invalid OTP. Please try again.');
            }
            await this.redis.del(this.emailOtpKey(emailKey), verifyKey);
        });
    }
};
exports.ListingOtpService = ListingOtpService;
exports.ListingOtpService = ListingOtpService = ListingOtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ListingOtpService);
//# sourceMappingURL=listing-otp.service.js.map