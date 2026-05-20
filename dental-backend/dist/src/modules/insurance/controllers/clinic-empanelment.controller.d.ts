import type { Response } from 'express';
import { CreateEmpanelmentDto } from '../dto/create-empanelment.dto.js';
import { UpdateEmpanelmentDto } from '../dto/update-empanelment.dto.js';
import { ClinicEmpanelmentService } from '../services/clinic-empanelment.service.js';
import { InsuranceFileService } from '../services/insurance-file.service.js';
export declare class ClinicEmpanelmentController {
    private readonly empanelments;
    private readonly files;
    constructor(empanelments: ClinicEmpanelmentService, files: InsuranceFileService);
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
    upload(clinicId: string, id: string, slot: string, file: Express.Multer.File): Promise<{
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
    getDownloadToken(clinicId: string, id: string, slot: string): Promise<{
        token: string;
        file_url: string;
    }>;
    serve(clinicId: string, filePath: string, token: string, res: Response): Promise<void>;
}
