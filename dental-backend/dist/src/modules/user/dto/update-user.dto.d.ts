import { CreateUserDto } from './create-user.dto.js';
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
declare const UpdateUserDto_base: import("@nestjs/common").Type<Partial<Omit<CreateUserDto, "password">>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
    status?: UserStatus;
}
export {};
