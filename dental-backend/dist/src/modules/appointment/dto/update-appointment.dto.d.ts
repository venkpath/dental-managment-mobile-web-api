import { CreateAppointmentDto, AppointmentStatus } from './create-appointment.dto.js';
declare const UpdateAppointmentDto_base: import("@nestjs/common").Type<Partial<Omit<CreateAppointmentDto, "branch_id" | "patient_id">>>;
export declare class UpdateAppointmentDto extends UpdateAppointmentDto_base {
    status?: AppointmentStatus;
}
export {};
