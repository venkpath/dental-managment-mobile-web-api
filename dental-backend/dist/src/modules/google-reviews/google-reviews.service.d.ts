import { PrismaService } from '../../database/prisma.service.js';
import { GoogleBusinessClient } from './google-business.client.js';
import { AiService } from '../ai/ai.service.js';
import { AiUsageService } from '../ai/ai-usage.service.js';
import { UpdateGoogleReviewSettingsDto } from './dto/update-settings.dto.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
export declare class GoogleReviewsService {
    private readonly prisma;
    private readonly google;
    private readonly aiService;
    private readonly aiUsage;
    private readonly logger;
    constructor(prisma: PrismaService, google: GoogleBusinessClient, aiService: AiService, aiUsage: AiUsageService);
    buildConnectUrl(clinicId: string): {
        url: string;
    };
    handleOAuthCallback(params: {
        code: string;
        state: string;
        userId?: string;
    }): Promise<{
        connection_status: string;
        account_name: string;
        locations: Array<{
            location_id: string;
            location_name: string;
            address?: string;
        }>;
    }>;
    listLocations(clinicId: string): Promise<Array<{
        location_id: string;
        location_name: string;
        address?: string;
    }>>;
    selectLocation(clinicId: string, locationId: string, locationName: string): Promise<{
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        access_token: string;
        refresh_token: string;
        location_id: string | null;
        scope: string | null;
        google_account_id: string;
        google_account_name: string;
        location_name: string | null;
        token_expires_at: Date;
        last_synced_at: Date | null;
        last_sync_error: string | null;
        connected_by: string | null;
    }>;
    disconnect(clinicId: string): Promise<{
        disconnected: boolean;
    }>;
    getConnectionStatus(clinicId: string): Promise<{
        status?: string | undefined;
        location_id?: string | null | undefined;
        scope?: string | null | undefined;
        google_account_id?: string | undefined;
        google_account_name?: string | undefined;
        location_name?: string | null | undefined;
        last_synced_at?: Date | null | undefined;
        last_sync_error?: string | null | undefined;
        connected: boolean;
    }>;
    ensureSettings(clinicId: string): Promise<{
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        signature: string | null;
        tone: string;
        custom_instructions: string | null;
        auto_reply_enabled: boolean;
        auto_post_min_rating: number;
        notify_admin_on_low: boolean;
    }>;
    getSettings(clinicId: string): Promise<{
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        signature: string | null;
        tone: string;
        custom_instructions: string | null;
        auto_reply_enabled: boolean;
        auto_post_min_rating: number;
        notify_admin_on_low: boolean;
    }>;
    updateSettings(clinicId: string, dto: UpdateGoogleReviewSettingsDto): Promise<{
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        signature: string | null;
        tone: string;
        custom_instructions: string | null;
        auto_reply_enabled: boolean;
        auto_post_min_rating: number;
        notify_admin_on_low: boolean;
    }>;
    listReviews(clinicId: string, q: ListReviewsQueryDto): Promise<{
        data: {
            id: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            language: string | null;
            approved_by: string | null;
            rating: number;
            reviewer_name: string | null;
            comment: string | null;
            google_review_id: string;
            location_id: string;
            reviewer_photo_url: string | null;
            review_created_at: Date;
            review_updated_at: Date;
            reply_status: string;
            ai_draft: string | null;
            posted_reply: string | null;
            posted_at: Date | null;
            approved_at: Date | null;
            last_error: string | null;
            retry_count: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
            counts_by_status: {
                [k: string]: number;
            };
        };
    }>;
    getReview(clinicId: string, reviewId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        language: string | null;
        approved_by: string | null;
        rating: number;
        reviewer_name: string | null;
        comment: string | null;
        google_review_id: string;
        location_id: string;
        reviewer_photo_url: string | null;
        review_created_at: Date;
        review_updated_at: Date;
        reply_status: string;
        ai_draft: string | null;
        posted_reply: string | null;
        posted_at: Date | null;
        approved_at: Date | null;
        last_error: string | null;
        retry_count: number;
    }>;
    approveAndPost(params: {
        clinicId: string;
        reviewId: string;
        userId: string;
        overrideReply?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        language: string | null;
        approved_by: string | null;
        rating: number;
        reviewer_name: string | null;
        comment: string | null;
        google_review_id: string;
        location_id: string;
        reviewer_photo_url: string | null;
        review_created_at: Date;
        review_updated_at: Date;
        reply_status: string;
        ai_draft: string | null;
        posted_reply: string | null;
        posted_at: Date | null;
        approved_at: Date | null;
        last_error: string | null;
        retry_count: number;
    }>;
    regenerateDraft(clinicId: string, reviewId: string, userId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        language: string | null;
        approved_by: string | null;
        rating: number;
        reviewer_name: string | null;
        comment: string | null;
        google_review_id: string;
        location_id: string;
        reviewer_photo_url: string | null;
        review_created_at: Date;
        review_updated_at: Date;
        reply_status: string;
        ai_draft: string | null;
        posted_reply: string | null;
        posted_at: Date | null;
        approved_at: Date | null;
        last_error: string | null;
        retry_count: number;
    }>;
    syncAllClinics(): Promise<{
        clinicsProcessed: number;
        reviewsSynced: number;
        repliesPosted: number;
        queuedForApproval: number;
    }>;
    syncClinic(clinicId: string): Promise<{
        synced: number;
        reviewsSynced: number;
        repliesPosted: number;
        queuedForApproval: number;
    }>;
    private handlePendingReview;
    private updateSyncedReviewFields;
    private notifyAdminsOfLowRating;
    private requireConnection;
    private getValidAccessToken;
}
