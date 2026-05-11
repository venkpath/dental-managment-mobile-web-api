import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
export type BranchWithClinic = Prisma.BranchGetPayload<{
    include: {
        clinic: {
            select: {
                id: true;
                name: true;
                logo_url: true;
            };
        };
    };
}>;
export declare class QrCodeService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    private generateToken;
    private getBaseUrl;
    generate(clinicId: string, branchId: string): Promise<{
        token: string;
        qr_link: string;
        qr_data_url: string;
        clinic_name: string;
        branch_name: string;
        enabled: boolean;
        generated_at: Date;
    }>;
    get(clinicId: string, branchId: string): Promise<{
        enabled: boolean;
        token: null;
        qr_link: null;
        qr_data_url: null;
        clinic_name: string;
        generated_at: null;
        branch_name?: undefined;
    } | {
        token: string;
        qr_link: string;
        qr_data_url: string | null;
        clinic_name: string;
        branch_name: string;
        enabled: boolean;
        generated_at: Date | null;
    }>;
    disable(clinicId: string, branchId: string): Promise<{
        message: string;
    }>;
    findBranchByToken(token: string): Promise<{
        clinic: {
            id: string;
            name: string;
            logo_url: string | null;
        };
    } & {
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        pincode: string | null;
        latitude: number | null;
        longitude: number | null;
        map_url: string | null;
        book_now_url: string | null;
        working_start_time: string | null;
        working_end_time: string | null;
        lunch_start_time: string | null;
        lunch_end_time: string | null;
        slot_duration: number | null;
        default_appt_duration: number | null;
        buffer_minutes: number | null;
        advance_booking_days: number | null;
        working_days: string | null;
        prescription_template_url: string | null;
        prescription_template_config: Prisma.JsonValue | null;
        prescription_template_enabled: boolean;
        qr_code_token: string | null;
        qr_code_enabled: boolean;
        qr_code_generated_at: Date | null;
        clinic_id: string;
    }>;
}
