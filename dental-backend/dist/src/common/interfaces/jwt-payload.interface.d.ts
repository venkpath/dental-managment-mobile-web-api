export interface JwtPayload {
    sub: string;
    type: 'user' | 'super_admin';
    clinic_id: string;
    role: string;
    branch_id: string | null;
}
export interface SuperAdminJwtPayload {
    sub: string;
    type: 'super_admin';
}
