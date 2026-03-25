import { FeedbackService } from './feedback.service.js';
import { CreateFeedbackDto, QueryFeedbackDto } from './dto/index.js';
export declare class FeedbackController {
    private readonly feedbackService;
    constructor(feedbackService: FeedbackService);
    create(clinicId: string, dto: CreateFeedbackDto): Promise<{
        patient: {
            id: string;
            email: string | null;
            first_name: string;
            last_name: string;
        };
    } & {
        id: string;
        created_at: Date;
        clinic_id: string;
        patient_id: string;
        appointment_id: string | null;
        rating: number;
        comment: string | null;
        google_review_requested: boolean;
    }>;
    findAll(clinicId: string, query: QueryFeedbackDto): Promise<{
        data: ({
            patient: {
                id: string;
                first_name: string;
                last_name: string;
            };
        } & {
            id: string;
            created_at: Date;
            clinic_id: string;
            patient_id: string;
            appointment_id: string | null;
            rating: number;
            comment: string | null;
            google_review_requested: boolean;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getStats(clinicId: string): Promise<{
        total_feedback: number;
        average_rating: number;
        google_review_requests: number;
        distribution: Record<number, number>;
    }>;
}
