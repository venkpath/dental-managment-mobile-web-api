import { PrismaService } from '../../database/prisma.service.js';
declare class BookAppointmentDto {
    first_name: string;
    last_name: string;
    phone: string;
    gender: string;
    email?: string;
    dentist_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    notes?: string;
}
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
    getDentists(clinicId: string, branchId: string): Promise<{
        id: string;
        name: string;
    }[]>;
    getAvailableSlots(clinicId: string, branchId: string, dentistId: string, date: string): Promise<{
        start_time: string;
        end_time: string;
        available: boolean;
    }[]>;
    bookAppointment(clinicId: string, branchId: string, dto: BookAppointmentDto): Promise<{
        success: boolean;
        message: string;
        appointment: {
            id: string;
            date: Date;
            start_time: string;
            end_time: string;
            dentist: string;
            patient: string;
        };
    }>;
}
export {};
