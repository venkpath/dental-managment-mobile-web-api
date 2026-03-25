import { TemplateService } from './template.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';
import { QueryTemplateDto } from './dto/query-template.dto.js';
export declare class TemplateController {
    private readonly templateService;
    constructor(templateService: TemplateService);
    create(clinicId: string, dto: CreateTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string | null;
        channel: string;
        category: string;
        template_name: string;
        subject: string | null;
        body: string;
        variables: import("@prisma/client/runtime/client").JsonValue | null;
        language: string;
        is_active: boolean;
        dlt_template_id: string | null;
        whatsapp_template_status: string | null;
    }>;
    findAll(clinicId: string, query: QueryTemplateDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string | null;
        channel: string;
        category: string;
        template_name: string;
        subject: string | null;
        body: string;
        variables: import("@prisma/client/runtime/client").JsonValue | null;
        language: string;
        is_active: boolean;
        dlt_template_id: string | null;
        whatsapp_template_status: string | null;
    }>>;
    findOne(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string | null;
        channel: string;
        category: string;
        template_name: string;
        subject: string | null;
        body: string;
        variables: import("@prisma/client/runtime/client").JsonValue | null;
        language: string;
        is_active: boolean;
        dlt_template_id: string | null;
        whatsapp_template_status: string | null;
    }>;
    update(clinicId: string, id: string, dto: UpdateTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string | null;
        channel: string;
        category: string;
        template_name: string;
        subject: string | null;
        body: string;
        variables: import("@prisma/client/runtime/client").JsonValue | null;
        language: string;
        is_active: boolean;
        dlt_template_id: string | null;
        whatsapp_template_status: string | null;
    }>;
    remove(clinicId: string, id: string): Promise<{
        deleted: boolean;
    }>;
}
