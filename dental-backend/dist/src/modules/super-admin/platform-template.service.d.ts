import { PrismaService } from '../../database/prisma.service.js';
import { TemplateRenderer } from '../communication/template-renderer.js';
export declare class PlatformTemplateService {
    private readonly prisma;
    private readonly renderer;
    constructor(prisma: PrismaService, renderer: TemplateRenderer);
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
    update(id: string, dto: {
        body?: string;
        subject?: string;
        language?: string;
        is_active?: boolean;
        category?: string;
    }): Promise<{
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
    preview(body: string, sampleValues: Record<string, string>): {
        rendered: string;
        variables: string[];
    };
    private isPlatformTemplate;
}
