export declare const TICKET_CATEGORIES: readonly ["bug", "feature_request", "billing", "account", "general"];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export declare const TICKET_STATUSES: readonly ["open", "in_progress", "resolved", "closed"];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export declare class CreateSupportTicketDto {
    category: TicketCategory;
    subject: string;
    message: string;
}
export declare class UpdateSupportTicketDto {
    status?: TicketStatus;
    admin_notes?: string;
}
