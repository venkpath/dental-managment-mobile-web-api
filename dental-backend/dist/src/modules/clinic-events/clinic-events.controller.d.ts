import { ClinicEventsService } from './clinic-events.service.js';
import { CreateClinicEventDto, UpdateClinicEventDto } from './dto/index.js';
export declare class ClinicEventsController {
    private readonly eventsService;
    constructor(eventsService: ClinicEventsService);
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
        is_recurring: boolean;
        event_name: string;
        event_date: Date;
        send_offer: boolean;
        occasion_message: string | null;
    })[]>;
    getUpcoming(clinicId: string, days?: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        is_recurring: boolean;
        event_name: string;
        event_date: Date;
        send_offer: boolean;
        occasion_message: string | null;
    }[]>;
    create(clinicId: string, dto: CreateClinicEventDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        is_recurring: boolean;
        event_name: string;
        event_date: Date;
        send_offer: boolean;
        occasion_message: string | null;
    }>;
    update(clinicId: string, id: string, dto: UpdateClinicEventDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        is_recurring: boolean;
        event_name: string;
        event_date: Date;
        send_offer: boolean;
        occasion_message: string | null;
    }>;
    remove(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        is_recurring: boolean;
        event_name: string;
        event_date: Date;
        send_offer: boolean;
        occasion_message: string | null;
    }>;
}
