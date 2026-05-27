import { CreateClinicDto } from './create-clinic.dto.js';
declare const UpdateClinicDto_base: import("@nestjs/common").Type<Partial<CreateClinicDto>>;
export declare class UpdateClinicDto extends UpdateClinicDto_base {
    rooms_enabled?: boolean;
    clinic_description?: string;
    specialties?: string;
    working_hours_label?: string;
    latitude?: number | null;
    longitude?: number | null;
    website_url?: string;
    google_maps_url?: string;
    established_year?: number | null;
    languages_spoken?: string;
    directory_treatments?: string;
    gallery_images?: string;
}
export {};
