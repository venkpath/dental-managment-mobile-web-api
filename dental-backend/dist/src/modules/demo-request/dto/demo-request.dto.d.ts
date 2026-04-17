export declare class CreateDemoRequestDto {
    name: string;
    email: string;
    phone: string;
    clinicName?: string;
    chairs?: string;
    source?: string;
}
export declare class UpdateDemoStatusDto {
    status: string;
    notes?: string;
    scheduledAt?: string;
    meetingLink?: string;
}
