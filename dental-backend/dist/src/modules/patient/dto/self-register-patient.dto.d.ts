import { Gender } from './create-patient.dto.js';
export declare class SelfRegisterPatientDto {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    gender?: Gender;
    date_of_birth?: string;
    age?: number;
}
