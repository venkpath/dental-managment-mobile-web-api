import { UserService } from './user.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
declare class AvailabilityDayDto {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_day_off?: boolean;
}
declare class UpsertAvailabilityDto {
    schedule: AvailabilityDayDto[];
}
declare class SetFeatureGrantsDto {
    feature_keys: string[];
}
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(clinicId: string, requestingUser: JwtPayload, dto: CreateUserDto): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        listed_in_directory: boolean;
        languages_spoken: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        is_doctor: boolean;
        license_number: string | null;
        signature_url: string | null;
        profile_photo_url: string | null;
        bio: string | null;
        years_experience: number | null;
        education: import("@prisma/client/runtime/client").JsonValue | null;
        specializations: import("@prisma/client/runtime/client").JsonValue | null;
        consultation_fee: import("@prisma/client-runtime-utils").Decimal | null;
        branch_id: string | null;
    }, "password_hash">>;
    findAll(clinicId: string, role?: string, search?: string, branchId?: string): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        listed_in_directory: boolean;
        languages_spoken: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        is_doctor: boolean;
        license_number: string | null;
        signature_url: string | null;
        profile_photo_url: string | null;
        bio: string | null;
        years_experience: number | null;
        education: import("@prisma/client/runtime/client").JsonValue | null;
        specializations: import("@prisma/client/runtime/client").JsonValue | null;
        consultation_fee: import("@prisma/client-runtime-utils").Decimal | null;
        branch_id: string | null;
    }, "password_hash">[]>;
    findOne(clinicId: string, id: string): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        listed_in_directory: boolean;
        languages_spoken: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        is_doctor: boolean;
        license_number: string | null;
        signature_url: string | null;
        profile_photo_url: string | null;
        bio: string | null;
        years_experience: number | null;
        education: import("@prisma/client/runtime/client").JsonValue | null;
        specializations: import("@prisma/client/runtime/client").JsonValue | null;
        consultation_fee: import("@prisma/client-runtime-utils").Decimal | null;
        branch_id: string | null;
    }, "password_hash">>;
    update(clinicId: string, id: string, dto: UpdateUserDto): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        listed_in_directory: boolean;
        languages_spoken: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        is_doctor: boolean;
        license_number: string | null;
        signature_url: string | null;
        profile_photo_url: string | null;
        bio: string | null;
        years_experience: number | null;
        education: import("@prisma/client/runtime/client").JsonValue | null;
        specializations: import("@prisma/client/runtime/client").JsonValue | null;
        consultation_fee: import("@prisma/client-runtime-utils").Decimal | null;
        branch_id: string | null;
    }, "password_hash">>;
    remove(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    uploadSignature(clinicId: string, id: string, file: Express.Multer.File): Promise<{
        signature_url: string;
    }>;
    uploadProfilePhoto(clinicId: string, id: string, file: Express.Multer.File): Promise<{
        profile_photo_url: string;
    }>;
    deleteProfilePhoto(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    getAvailability(clinicId: string, id: string): Promise<{
        id: string;
        clinic_id: string;
        user_id: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_day_off: boolean;
    }[]>;
    getFeatureGrants(clinicId: string, id: string): Promise<{
        feature_keys: string[];
    }>;
    setFeatureGrants(clinicId: string, id: string, dto: SetFeatureGrantsDto): Promise<{
        feature_keys: string[];
    }>;
    upsertAvailability(clinicId: string, id: string, dto: UpsertAvailabilityDto): Promise<{
        id: string;
        clinic_id: string;
        user_id: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_day_off: boolean;
    }[]>;
}
export {};
