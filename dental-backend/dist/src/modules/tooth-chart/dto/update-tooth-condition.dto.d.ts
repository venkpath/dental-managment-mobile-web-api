import { CreateToothConditionDto } from './create-tooth-condition.dto.js';
declare const UpdateToothConditionDto_base: import("@nestjs/common").Type<Partial<Omit<CreateToothConditionDto, "branch_id" | "patient_id" | "tooth_id" | "diagnosed_by">>>;
export declare class UpdateToothConditionDto extends UpdateToothConditionDto_base {
}
export {};
