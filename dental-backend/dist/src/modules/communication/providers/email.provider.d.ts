import type { ChannelProvider, SendMessageOptions, SendResult } from './channel-provider.interface.js';
export interface EmailProviderConfig {
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    pass: string;
    from?: string;
}
export declare class EmailProvider implements ChannelProvider {
    readonly channel: "email";
    private readonly logger;
    private readonly clinicTransporters;
    configure(clinicId: string, config: EmailProviderConfig, providerName: string): void;
    verify(clinicId: string): Promise<{
        ok: boolean;
        error?: string;
    }>;
    getProviderName(clinicId: string): string;
    isConfigured(clinicId: string): boolean;
    removeClinic(clinicId: string): void;
    send(options: SendMessageOptions): Promise<SendResult>;
}
