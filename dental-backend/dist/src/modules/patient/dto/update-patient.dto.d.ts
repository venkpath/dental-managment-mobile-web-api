import { CreatePatientDto } from './create-patient.dto.js';
declare const UpdatePatientDto_base: import("@nestjs/common").Type<Partial<Omit<CreatePatientDto, "branch_id">>>;
export declare class UpdatePatientDto extends UpdatePatientDto_base {
}
export {};
