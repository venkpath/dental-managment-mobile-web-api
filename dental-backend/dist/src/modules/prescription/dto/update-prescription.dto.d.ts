import { PrescriptionItemDto } from './create-prescription.dto.js';
export declare class UpdatePrescriptionDto {
    diagnosis?: string;
    instructions?: string;
    dentist_id?: string;
    items?: PrescriptionItemDto[];
}
