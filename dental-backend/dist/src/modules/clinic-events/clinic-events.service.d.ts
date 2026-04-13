import { PrismaService } from '../../database/prisma.service.js';
import type { CreateClinicEventDto, UpdateClinicEventDto } from './dto/index.js';
export declare class ClinicEventsService {
    private readonly prisma;
    private readonly logger;
    private seeded;
    private seedingPromise;
    constructor(prisma: PrismaService);
    seedSystemEvents(): Promise<void>;
    private _doSeed;
    private _deduplicateSystemEvents;
    refreshSystemFestivalDatesForYear(year: number): Promise<void>;
    findAll(clinicId: string): Promise<({
        template: {
            id: string;
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        occasion_message: string | null;
    })[]>;
    create(clinicId: string, dto: CreateClinicEventDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        occasion_message: string | null;
    }>;
    update(clinicId: string, eventId: string, dto: UpdateClinicEventDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        occasion_message: string | null;
    }>;
    remove(clinicId: string, eventId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        occasion_message: string | null;
    }>;
    getUpcoming(clinicId: string, days?: number): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        occasion_message: string | null;
    }[]>;
}
