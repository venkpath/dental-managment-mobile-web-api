import { PrismaService } from '../../database/prisma.service.js';
declare class ListReviewsQuery {
    status?: string;
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
            comment: string | null;
            doctor: {
                id: string;
                name: string;
            } | null;
            token_used_at: Date | null;
            reviewer_name: string;
            overall_rating: number;
            cleanliness_rating: number | null;
            staff_rating: number | null;
            wait_time_rating: number | null;
            value_rating: number | null;
            approval_status: string;
            is_visible: boolean;
            is_verified: boolean;
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
