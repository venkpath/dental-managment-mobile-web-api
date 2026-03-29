import { PrismaService } from '../../database/prisma.service.js';
export declare class PublicBookingController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBranchBookingInfo(clinicId: string, branchId: string): Promise<{
        clinic: {
            id: string;
            email: string;
            name: string;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
        };
        branch: {
            id: string;
            name: string;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            phone: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            working_hours: {
                start: string;
                end: string;
                lunch_start: string | null;
                lunch_end: string | null;
                working_days: string;
            };
            slot_duration: number;
        };
        booking_url: string;
        has_custom_booking: boolean;
    }>;
}
