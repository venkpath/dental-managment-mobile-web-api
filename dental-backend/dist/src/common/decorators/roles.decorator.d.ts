import { UserRole } from '../../modules/user/dto/create-user.dto.js';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
