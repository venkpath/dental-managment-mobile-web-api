import { CreateTreatmentDto, TreatmentStatus } from './create-treatment.dto.js';
declare const UpdateTreatmentDto_base: import("@nestjs/common").Type<Partial<Omit<CreateTreatmentDto, "branch_id" | "patient_id">>>;
export declare class UpdateTreatmentDto extends UpdateTreatmentDto_base {
    status?: TreatmentStatus;
}
export {};
