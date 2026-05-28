import { CreateUserDto } from './create-user.dto.js';
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
declare const UpdateUserDto_base: import("@nestjs/common").Type<Partial<Omit<CreateUserDto, "branch_id" | "password">>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
    branch_id?: string | null;
    status?: UserStatus;
}
export {};
