import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class OtpService implements OnModuleDestroy {
    private readonly redis;
    constructor(config: ConfigService);
    onModuleDestroy(): Promise<void>;
    private otpKey;
    private sendAttemptsKey;
    private verifyAttemptsKey;
    private tokenKey;
    generateAndStore(clinicId: string, phone: string): Promise<string>;
    verify(clinicId: string, phone: string, otp: string): Promise<string>;
    consumeToken(token: string, clinicId: string, phone: string): Promise<boolean>;
}
