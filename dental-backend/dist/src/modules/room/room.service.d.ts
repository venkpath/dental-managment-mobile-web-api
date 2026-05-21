import { PrismaService } from '../../database/prisma.service.js';
import { CreateRoomDto, UpdateRoomDto, UpdateRoomStatusDto, AssignRoomDto } from './dto/index.js';
export declare class RoomService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(clinicId: string, branchId?: string): Promise<({
        appointments: ({
            dentist: {
                id: string;
                name: string;
            };
            patient: {
                id: string;
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
            dentist_id: string;
            start_time: string;
            end_time: string;
            recurrence_group_id: string | null;
            room_id: string | null;
        })[];
        branch: {
            id: string;
            name: string;
            room_cleaning_duration_minutes: number | null;
        };
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
    })[]>;
    findOne(clinicId: string, id: string): Promise<{
        appointments: ({
            dentist: {
                id: string;
                name: string;
            };
            patient: {
                id: string;
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
            dentist_id: string;
            start_time: string;
            end_time: string;
            recurrence_group_id: string | null;
            room_id: string | null;
        })[];
        branch: {
            id: string;
            name: string;
            room_cleaning_duration_minutes: number | null;
        };
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
    }>;
    create(clinicId: string, branchId: string, dto: CreateRoomDto): Promise<{
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
    }>;
    update(clinicId: string, id: string, dto: UpdateRoomDto): Promise<{
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
    }>;
    setStatus(clinicId: string, id: string, dto: UpdateRoomStatusDto): Promise<{
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
    }>;
    assignAppointment(clinicId: string, roomId: string, dto: AssignRoomDto): Promise<{
        appointments: ({
            dentist: {
                id: string;
                name: string;
            };
            patient: {
                id: string;
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
            dentist_id: string;
            start_time: string;
            end_time: string;
            recurrence_group_id: string | null;
            room_id: string | null;
        })[];
        branch: {
            id: string;
            name: string;
            room_cleaning_duration_minutes: number | null;
        };
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
    }>;
    remove(clinicId: string, id: string): Promise<{
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
    }>;
}
