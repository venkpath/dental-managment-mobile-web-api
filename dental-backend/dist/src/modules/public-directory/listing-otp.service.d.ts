import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class ListingOtpService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private readonly redis;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    normalizePhoneKey(phone: string): string;
    normalizeEmailKey(email: string): string;
    private phoneOtpKey;
    private emailOtpKey;
    private phoneSendKey;
    private emailSendKey;
    private phoneVerifyKey;
    private emailVerifyKey;
    private codesMatch;
    private withRedis;
    assertPhoneSendAllowed(phone: string): Promise<string>;
    assertEmailSendAllowed(email: string): Promise<string>;
    rollbackPhoneSend(phoneKey: string): Promise<void>;
    rollbackEmailSend(emailKey: string): Promise<void>;
    storePhoneOtp(phoneKey: string, otp: string): Promise<void>;
    storeEmailOtp(emailKey: string, otp: string): Promise<void>;
    verifyPhoneOtp(phoneKey: string, code: string): Promise<void>;
    verifyEmailOtp(emailKey: string, code: string): Promise<void>;
}
