import { PrismaService } from '../../database/prisma.service.js';
declare class ListReviewsQuery {
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
}
export declare class ClinicReviewsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listReviews(clinicId: string, query: ListReviewsQuery): Promise<{
        data: {
            id: string;
            created_at: Date;
            patient: {
                id: string;
                phone: string;
                first_name: string;
                last_name: string;
            } | null;
            source: string;
            reviewer_name: string;
            comment: string | null;
            token_used_at: Date | null;
            overall_rating: number;
            cleanliness_rating: number | null;
            staff_rating: number | null;
            wait_time_rating: number | null;
            value_rating: number | null;
            approval_status: string;
            is_visible: boolean;
            is_verified: boolean;
            doctor: {
                id: string;
                name: string;
            } | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
        };
    }>;
    getCounts(clinicId: string): Promise<{
        submitted: number;
        approved: number;
        rejected: number;
    }>;
    approveReview(clinicId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    rejectReview(clinicId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
