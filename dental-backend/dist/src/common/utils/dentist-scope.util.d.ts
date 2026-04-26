import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';
export declare function applyDentistScope<T extends {
    dentist_id?: string | null;
}>(query: T, user: JwtPayload | undefined | null): T;
export declare function isDentistUser(user: JwtPayload | undefined | null): boolean;
