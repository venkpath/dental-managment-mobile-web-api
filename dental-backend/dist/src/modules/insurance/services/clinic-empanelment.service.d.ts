import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';
import type { CreateEmpanelmentDto } from '../dto/create-empanelment.dto.js';
import type { UpdateEmpanelmentDto } from '../dto/update-empanelment.dto.js';
export declare class ClinicEmpanelmentService {
    private readonly prisma;
    private readonly files;
    constructor(prisma: PrismaService, files: InsuranceFileService);
    list(clinicId: string): Promise<({
        provider: {
            id: string;
            name: string;
            country: string;
            tpa_name: string | null;
            short_code: string;
            type: string;
            claim_method: string;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        provider_id: string;
        empanelment_number: string;
        valid_from: Date | null;
        valid_to: Date | null;
        certificate_url: string | null;
        rate_card_url: string | null;
        tpa_mou_url: string | null;
        bank_account_name: string | null;
        bank_account_number: string | null;
        bank_ifsc: string | null;
        bank_name: string | null;
        contact_person_name: string | null;
        contact_person_phone: string | null;
        contact_person_email: string | null;
    })[]>;
    get(clinicId: string, id: string): Promise<{
        provider: {
            id: string;
            name: string;
            country: string;
            tpa_name: string | null;
            short_code: string;
            type: string;
            claim_method: string;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        provider_id: string;
        empanelment_number: string;
        valid_from: Date | null;
        valid_to: Date | null;
        certificate_url: string | null;
        rate_card_url: string | null;
        tpa_mou_url: string | null;
        bank_account_name: string | null;
        bank_account_number: string | null;
        bank_ifsc: string | null;
        bank_name: string | null;
        contact_person_name: string | null;
        contact_person_phone: string | null;
        contact_person_email: string | null;
    }>;
    create(clinicId: string, dto: CreateEmpanelmentDto): Promise<{
        provider: {
            id: string;
            name: string;
            country: string;
            tpa_name: string | null;
            short_code: string;
            type: string;
            claim_method: string;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        provider_id: string;
        empanelment_number: string;
        valid_from: Date | null;
        valid_to: Date | null;
        certificate_url: string | null;
        rate_card_url: string | null;
        tpa_mou_url: string | null;
        bank_account_name: string | null;
        bank_account_number: string | null;
        bank_ifsc: string | null;
        bank_name: string | null;
        contact_person_name: string | null;
        contact_person_phone: string | null;
        contact_person_email: string | null;
    }>;
    update(clinicId: string, id: string, dto: UpdateEmpanelmentDto): Promise<{
        provider: {
            id: string;
            name: string;
            country: string;
            tpa_name: string | null;
            short_code: string;
            type: string;
            claim_method: string;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        provider_id: string;
        empanelment_number: string;
        valid_from: Date | null;
        valid_to: Date | null;
        certificate_url: string | null;
        rate_card_url: string | null;
        tpa_mou_url: string | null;
        bank_account_name: string | null;
        bank_account_number: string | null;
        bank_ifsc: string | null;
        bank_name: string | null;
        contact_person_name: string | null;
        contact_person_phone: string | null;
        contact_person_email: string | null;
    }>;
    remove(clinicId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    uploadDocument(clinicId: string, id: string, slot: 'certificate' | 'rate_card' | 'tpa_mou', file: Express.Multer.File): Promise<{
        provider: {
            id: string;
            name: string;
            country: string;
            tpa_name: string | null;
            short_code: string;
            type: string;
            claim_method: string;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        provider_id: string;
        empanelment_number: string;
        valid_from: Date | null;
        valid_to: Date | null;
        certificate_url: string | null;
        rate_card_url: string | null;
        tpa_mou_url: string | null;
        bank_account_name: string | null;
        bank_account_number: string | null;
        bank_ifsc: string | null;
        bank_name: string | null;
        contact_person_name: string | null;
        contact_person_phone: string | null;
        contact_person_email: string | null;
    }>;
    findActiveEmpanelment(clinicId: string, providerId: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        provider_id: string;
        empanelment_number: string;
        valid_from: Date | null;
        valid_to: Date | null;
        certificate_url: string | null;
        rate_card_url: string | null;
        tpa_mou_url: string | null;
        bank_account_name: string | null;
        bank_account_number: string | null;
        bank_ifsc: string | null;
        bank_name: string | null;
        contact_person_name: string | null;
        contact_person_phone: string | null;
        contact_person_email: string | null;
    } | null>;
    private ensureProviderVisible;
}
