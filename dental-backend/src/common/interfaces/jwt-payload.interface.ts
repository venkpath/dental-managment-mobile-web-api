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

/** Long-lived token used only at POST /auth/refresh to mint a new access token. */
export interface RefreshJwtPayload {
  sub: string;
  type: 'refresh';
  clinic_id: string;
}
