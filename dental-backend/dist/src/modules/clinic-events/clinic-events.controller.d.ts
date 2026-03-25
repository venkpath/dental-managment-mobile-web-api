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
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    getUpcoming(clinicId: string, days?: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
    create(clinicId: string, dto: CreateClinicEventDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    update(clinicId: string, id: string, dto: UpdateClinicEventDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    remove(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string | null;
        template_id: string | null;
        event_name: string;
        event_date: Date;
        is_recurring: boolean;
        send_offer: boolean;
        offer_details: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
