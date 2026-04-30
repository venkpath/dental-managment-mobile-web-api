import { PrismaService } from '../../database/prisma.service.js';
import { PrescriptionPdfService } from '../prescription/prescription-pdf.service.js';
export declare class BranchPrescriptionTemplateService {
    private readonly prisma;
    private readonly pdfService;
    constructor(prisma: PrismaService, pdfService: PrescriptionPdfService);
    private assertBranch;
    private templateDir;
    private validateZone;
    private validateConfig;
    getTemplate(clinicId: string, branchId: string): Promise<{
        url: string | null;
        config: import("@prisma/client/runtime/client").JsonValue;
        enabled: boolean;
    }>;
    uploadImage(clinicId: string, branchId: string, file: Express.Multer.File): Promise<{
        url: string;
        width_px: number;
        height_px: number;
        format: "png" | "jpeg";
    }>;
    saveConfig(clinicId: string, branchId: string, rawConfig: unknown, enabled?: boolean): Promise<{
        prescription_template_url: string | null;
        prescription_template_config: import("@prisma/client/runtime/client").JsonValue;
        prescription_template_enabled: boolean;
    }>;
    deleteTemplate(clinicId: string, branchId: string): Promise<{
        prescription_template_url: string | null;
        prescription_template_config: import("@prisma/client/runtime/client").JsonValue;
        prescription_template_enabled: boolean;
    }>;
    generatePreview(clinicId: string, branchId: string, rawConfig: unknown, withBackground: boolean): Promise<Buffer>;
    readTemplateImage(relativePath: string): Promise<Buffer | null>;
    resolveTemplateFile(branchId: string, filename: string): string | null;
    private deleteTemplateFile;
}
