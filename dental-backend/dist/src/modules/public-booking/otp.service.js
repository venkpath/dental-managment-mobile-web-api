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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const OTP_TTL_SECONDS = 10 * 60;
const TOKEN_TTL_SECONDS = 30 * 60;
const MAX_SEND_ATTEMPTS = 5;
const MAX_VERIFY_ATTEMPTS = 10;
let OtpService = class OtpService {
    redis;
    constructor(config) {
        this.redis = new ioredis_1.default({
            host: config.get('redis.host', 'localhost'),
            port: config.get('redis.port', 6379),
            password: config.get('redis.password'),
            tls: config.get('redis.tls') ? {} : undefined,
            maxRetriesPerRequest: 3,
            lazyConnect: false,
        });
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
    otpKey(clinicId, phone) {
        return `otp:code:${clinicId}:${phone}`;
    }
    sendAttemptsKey(clinicId, phone) {
        return `otp:send_attempts:${clinicId}:${phone}`;
    }
    verifyAttemptsKey(clinicId, phone) {
        return `otp:verify_attempts:${clinicId}:${phone}`;
    }
    tokenKey(token) {
        return `otp:token:${token}`;
    }
    async generateAndStore(clinicId, phone) {
        const attKey = this.sendAttemptsKey(clinicId, phone);
        const attempts = await this.redis.incr(attKey);
        if (attempts === 1) {
            await this.redis.expire(attKey, OTP_TTL_SECONDS);
        }
        if (attempts > MAX_SEND_ATTEMPTS) {
            throw new common_1.BadRequestException('Too many OTP requests. Please wait a few minutes and try again.');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await this.redis.set(this.otpKey(clinicId, phone), otp, 'EX', OTP_TTL_SECONDS);
        await this.redis.del(this.verifyAttemptsKey(clinicId, phone));
        return otp;
    }
    async verify(clinicId, phone, otp) {
        const vaKey = this.verifyAttemptsKey(clinicId, phone);
        const verifyAttempts = await this.redis.incr(vaKey);
        if (verifyAttempts === 1) {
            await this.redis.expire(vaKey, OTP_TTL_SECONDS);
        }
        if (verifyAttempts > MAX_VERIFY_ATTEMPTS) {
            throw new common_1.BadRequestException('Too many failed attempts. Please request a new OTP.');
        }
        const stored = await this.redis.get(this.otpKey(clinicId, phone));
        if (!stored) {
            throw new common_1.BadRequestException('OTP has expired. Please request a new one.');
        }
        const paddedStored = stored.padEnd(otp.length, '\0');
        const paddedOtp = otp.padEnd(stored.length, '\0');
        const match = stored.length === otp.length &&
            (0, crypto_1.timingSafeEqual)(Buffer.from(paddedStored), Buffer.from(paddedOtp));
        if (!match) {
            throw new common_1.BadRequestException('Invalid OTP. Please check and try again.');
        }
        await this.redis.del(this.otpKey(clinicId, phone), this.verifyAttemptsKey(clinicId, phone));
        const token = (0, crypto_1.randomUUID)();
        await this.redis.set(this.tokenKey(token), `${clinicId}:${phone}`, 'EX', TOKEN_TTL_SECONDS);
        return token;
    }
    async consumeToken(token, clinicId, phone) {
        const key = this.tokenKey(token);
        const stored = await this.redis.get(key);
        if (!stored || stored !== `${clinicId}:${phone}`)
            return false;
        await this.redis.del(key);
        return true;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OtpService);
//# sourceMappingURL=otp.service.js.map