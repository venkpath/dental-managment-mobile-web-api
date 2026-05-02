import type { ConsentTemplateBody } from './default-templates.js';
export interface ConsentPdfData {
    template_title: string;
    template_version: number;
    language: string;
    body: ConsentTemplateBody;
    procedure?: string | null;
    treatment_summary?: string | null;
    generated_at: Date;
    clinic: {
        name: string;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        logo_image?: Buffer | null;
    };
    branch: {
        name: string;
        phone?: string | null;
        address?: string | null;
        city?: string | null;
    };
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        phone: string;
        age?: number | null;
        gender?: string | null;
        date_of_birth?: Date | string | null;
        guardian_name?: string | null;
    };
    doctor?: {
        name: string;
        license_number?: string | null;
        signature_image?: Buffer | null;
    } | null;
    signature?: {
        method: 'digital' | 'upload';
        signed_by_name: string;
        signed_at: Date;
        image?: Buffer | null;
        witness_name?: string | null;
    } | null;
}
export declare class ConsentPdfService {
    generate(data: ConsentPdfData): Promise<Buffer>;
    private static readonly M;
    private get M();
    private ensureSpace;
    private renderHeader;
    private renderTitle;
    private renderPatientCard;
    private renderProcedureClause;
    private renderAnaesthesiaOptions;
    private renderSections;
    private renderConsentStatement;
    private renderSignatureLines;
    private renderFooter;
}
