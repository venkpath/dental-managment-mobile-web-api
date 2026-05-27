import { PrismaService } from '../../database/prisma.service.js';
export declare class PublicDisplayController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRoomsByToken(token: string): Promise<{
        clinic_name: string;
        clinic_logo_url: string | null;
        branch_name: string;
        room_cleaning_duration_minutes: number;
        rooms: ({
            appointments: ({
                dentist: {
                    name: string;
                };
                patient: {
                    first_name: string;
                    last_name: string;
                };
            } & {
                id: string;
                status: string;
                created_at: Date;
                updated_at: Date;
                clinic_id: string;
                branch_id: string;
                appointment_date: Date;
                notes: string | null;
                patient_id: string;
                start_time: string;
                end_time: string;
                dentist_id: string;
                recurrence_group_id: string | null;
                room_id: string | null;
            })[];
        } & {
            id: string;
            name: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            branch_id: string;
            is_active: boolean;
            notes: string | null;
            room_type: string;
            cleaning_started_at: Date | null;
            sort_order: number;
        })[];
    }>;
}
