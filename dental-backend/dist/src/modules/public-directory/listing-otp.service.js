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
let ListingOtpService = ListingOtpService_1 = class ListingOtpService {
    logger = new common_1.Logger(ListingOtpService_1.name);
    redis;
    memPhone = new Map();
    memEmail = new Map();
    constructor(config) {
        this.redis = new ioredis_1.default({
            host: config.get('redis.host', 'localhost'),
            port: config.get('redis.port', 6379),
            password: config.get('redis.password'),
            tls: config.get('redis.tls') ? {} : undefined,
            maxRetriesPerRequest: 3,
            lazyConnect: false,
        });
        this.redis.on('error', (err) => {
            this.logger.warn(`Listing OTP Redis error: ${err.message}`);
        });
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
    async redisAvailable() {
        try {
            await this.redis.ping();
            return true;
        }
        catch {
            return false;
        }
    }
    async assertPhoneSendAllowed(phone) {
        const key = this.normalizePhoneKey(phone);
        if (await this.redisAvailable()) {
            const sendKey = this.phoneSendKey(key);
            const count = await this.redis.incr(sendKey);
            if (count === 1)
                await this.redis.expire(sendKey, PHONE_SEND_WINDOW_SECONDS);
            if (count > MAX_PHONE_SENDS_PER_HOUR) {
                throw new common_1.BadRequestException('Too many OTP requests for this number. Please try again after an hour.');
            }
            return key;
        }
        this.logger.warn('Redis unavailable — using in-memory listing phone OTP store');
        return key;
    }
    async assertEmailSendAllowed(email) {
        const key = this.normalizeEmailKey(email);
        if (await this.redisAvailable()) {
            const sendKey = this.emailSendKey(key);
            const count = await this.redis.incr(sendKey);
            if (count === 1)
                await this.redis.expire(sendKey, EMAIL_SEND_WINDOW_SECONDS);
            if (count > MAX_EMAIL_SENDS_PER_WINDOW) {
                throw new common_1.BadRequestException('Too many OTP requests for this email. Please wait a few minutes and try again.');
            }
            return key;
        }
        this.logger.warn('Redis unavailable — using in-memory listing email OTP store');
        return key;
    }
    async rollbackEmailSend(emailKey) {
        if (!(await this.redisAvailable()))
            return;
        const sendKey = this.emailSendKey(emailKey);
        const count = await this.redis.decr(sendKey);
        if (count <= 0)
            await this.redis.del(sendKey);
    }
    async storePhoneOtp(phoneKey, otp) {
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
    async storeEmailOtp(emailKey, otp) {
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
    async verifyPhoneOtp(phoneKey, code) {
        if (await this.redisAvailable()) {
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
            return;
        }
        const entry = this.memPhone.get(phoneKey);
        if (!entry || Date.now() > entry.expiresAt) {
            this.memPhone.delete(phoneKey);
            throw new common_1.BadRequestException('OTP not found or expired. Please request a new one.');
        }
        if (entry.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
            this.memPhone.delete(phoneKey);
            throw new common_1.BadRequestException('Too many failed attempts. Please request a new OTP.');
        }
        if (!this.codesMatch(entry.code, code)) {
            entry.verifyAttempts++;
            throw new common_1.BadRequestException('Invalid OTP. Please try again.');
        }
        this.memPhone.delete(phoneKey);
    }
    async verifyEmailOtp(emailKey, code) {
        if (await this.redisAvailable()) {
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
            return;
        }
        const entry = this.memEmail.get(emailKey);
        if (!entry || Date.now() > entry.expiresAt) {
            this.memEmail.delete(emailKey);
            throw new common_1.BadRequestException('OTP not found or expired. Please request a new one.');
        }
        if (entry.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
            this.memEmail.delete(emailKey);
            throw new common_1.BadRequestException('Too many failed attempts. Please request a new OTP.');
        }
        if (!this.codesMatch(entry.code, code)) {
            entry.verifyAttempts++;
            throw new common_1.BadRequestException('Invalid OTP. Please try again.');
        }
        this.memEmail.delete(emailKey);
    }
};
exports.ListingOtpService = ListingOtpService;
exports.ListingOtpService = ListingOtpService = ListingOtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ListingOtpService);
//# sourceMappingURL=listing-otp.service.js.map