declare namespace Express {
  interface Request {
    clinicId?: string;
    user?: {
      userId: string;
      clinicId: string;
      role: string;
      branchId: string | null;
    };
    superAdmin?: {
      id: string;
    };
  }
}
