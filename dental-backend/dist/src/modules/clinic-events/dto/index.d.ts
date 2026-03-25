export declare class CreateClinicEventDto {
    event_name: string;
    event_date: string;
    is_recurring?: boolean;
    template_id?: string;
    send_offer?: boolean;
    offer_details?: Record<string, unknown>;
}
export declare class UpdateClinicEventDto {
    event_name?: string;
    event_date?: string;
    is_recurring?: boolean;
    is_enabled?: boolean;
    template_id?: string;
    send_offer?: boolean;
    offer_details?: Record<string, unknown>;
}
