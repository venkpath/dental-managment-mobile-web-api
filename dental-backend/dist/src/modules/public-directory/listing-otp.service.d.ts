import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class ListingOtpService implements OnModuleDestroy {
    private readonly logger;
    private readonly redis;
    private readonly memPhone;
    private readonly memEmail;
    constructor(config: ConfigService);
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
    private redisAvailable;
    assertPhoneSendAllowed(phone: string): Promise<string>;
    assertEmailSendAllowed(email: string): Promise<string>;
    rollbackEmailSend(emailKey: string): Promise<void>;
    storePhoneOtp(phoneKey: string, otp: string): Promise<void>;
    storeEmailOtp(emailKey: string, otp: string): Promise<void>;
    verifyPhoneOtp(phoneKey: string, code: string): Promise<void>;
    verifyEmailOtp(emailKey: string, code: string): Promise<void>;
}
