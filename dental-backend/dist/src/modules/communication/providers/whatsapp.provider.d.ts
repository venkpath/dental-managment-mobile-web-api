import type { ChannelProvider, SendMessageOptions, SendResult } from './channel-provider.interface.js';
export interface WhatsAppProviderConfig {
    accessToken: string;
    phoneNumberId: string;
    wabaId?: string;
}
export interface WhatsAppInteractiveButton {
    type: 'reply' | 'url';
    title: string;
    id?: string;
    url?: string;
}
export interface WhatsAppMediaOptions {
    type: 'image' | 'document' | 'video' | 'audio' | 'location';
    url?: string;
    caption?: string;
    filename?: string;
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
}
export declare class WhatsAppProvider implements ChannelProvider {
    readonly channel: "whatsapp";
    private readonly logger;
    private readonly clinicConfigs;
    configure(clinicId: string, config: WhatsAppProviderConfig, providerName: string): void;
    getProviderName(clinicId: string): string;
    isConfigured(clinicId: string): boolean;
    removeClinic(clinicId: string): void;
    trackIncomingMessage(clinicId: string, phone: string): void;
    isSessionOpen(clinicId: string, phone: string): boolean;
    send(options: SendMessageOptions): Promise<SendResult>;
    submitTemplate(clinicId: string, templateData: {
        elementName: string;
        languageCode: string;
        category: string;
        templateType: string;
        body: string;
        header?: string;
        footer?: string;
        buttons?: WhatsAppInteractiveButton[];
    }): Promise<{
        success: boolean;
        templateId?: string;
        error?: string;
    }>;
    fetchAllTemplates(clinicId: string): Promise<{
        success: boolean;
        templates?: Array<{
            name: string;
            language: string;
            status: string;
            category: string;
            components: Array<Record<string, unknown>>;
            id: string;
            rejectedReason?: string;
        }>;
        error?: string;
    }>;
    getTemplateStatus(clinicId: string, templateName: string): Promise<{
        status: string;
        rejectedReason?: string;
    }>;
    deleteTemplateFromMeta(clinicId: string, templateName: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    editTemplateOnMeta(clinicId: string, metaTemplateId: string, templateData: {
        body: string;
        header?: string;
        footer?: string;
        category?: string;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    private buildTextPayload;
    private buildTemplatePayload;
    private buildInteractivePayload;
    private buildMediaPayload;
    sendFreeText(clinicId: string, to: string, body: string): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
}
