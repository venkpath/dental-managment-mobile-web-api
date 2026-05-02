import { PlatformTemplateService } from './platform-template.service.js';
declare class UpdatePlatformTemplateDto {
    body?: string;
    subject?: string;
    language?: string;
    is_active?: boolean;
    category?: string;
}
declare class PreviewPlatformTemplateDto {
    body: string;
    sampleValues?: Record<string, string>;
}
export declare class PlatformTemplateController {
    private readonly service;
    constructor(service: PlatformTemplateService);
    list(): Promise<{
        sampleValues: Record<string, string>;
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string | null;
        channel: string;
        category: string;
        template_name: string;
        subject: string | null;
        footer: string | null;
        body: string;
        variables: import("@prisma/client/runtime/client").JsonValue | null;
        language: string;
        is_active: boolean;
        dlt_template_id: string | null;
        whatsapp_template_status: string | null;
        meta_template_id: string | null;
    }[]>;
    get(id: string): Promise<{
        sampleValues: Record<string, string>;
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string | null;
        channel: string;
        category: string;
        template_name: string;
        subject: string | null;
        footer: string | null;
        body: string;
        variables: import("@prisma/client/runtime/client").JsonValue | null;
        language: string;
        is_active: boolean;
        dlt_template_id: string | null;
        whatsapp_template_status: string | null;
        meta_template_id: string | null;
    }>;
    update(id: string, dto: UpdatePlatformTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string | null;
        channel: string;
        category: string;
        template_name: string;
        subject: string | null;
        footer: string | null;
        body: string;
        variables: import("@prisma/client/runtime/client").JsonValue | null;
        language: string;
        is_active: boolean;
        dlt_template_id: string | null;
        whatsapp_template_status: string | null;
        meta_template_id: string | null;
    }>;
    preview(dto: PreviewPlatformTemplateDto): {
        rendered: string;
        variables: string[];
    };
}
export {};
