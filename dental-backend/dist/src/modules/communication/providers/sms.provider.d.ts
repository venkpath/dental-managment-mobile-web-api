import type { ChannelProvider, SendMessageOptions, SendResult } from './channel-provider.interface.js';
export interface SmsProviderConfig {
    apiKey: string;
    senderId: string;
    dltEntityId?: string;
    route?: 'transactional' | 'promotional';
}
export declare class SmsProvider implements ChannelProvider {
    readonly channel: "sms";
    private readonly logger;
    private readonly clinicConfigs;
    configure(clinicId: string, config: SmsProviderConfig, providerName: string): void;
    getProviderName(clinicId: string): string;
    isConfigured(clinicId: string): boolean;
    removeClinic(clinicId: string): void;
    send(options: SendMessageOptions): Promise<SendResult>;
}
