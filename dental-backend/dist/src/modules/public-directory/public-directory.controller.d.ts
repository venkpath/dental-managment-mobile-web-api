import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
declare class DirectorySearchQuery {
    lat?: number;
    lng?: number;
    city?: string;
    specialty?: string;
    q?: string;
    page?: number;
    limit?: number;
    availableToday?: boolean;
    radius?: number;
    sort?: string;
    country?: string;
}
declare class SubmitReviewDto {
    reviewer_name: string;
    overall_rating: number;
    cleanliness_rating?: number;
    staff_rating?: number;
    wait_time_rating?: number;
    value_rating?: number;
    comment?: string;
}
declare class ReviewSortQuery {
    sort?: string;
    page?: number;
    limit?: number;
}
export declare class PublicDirectoryController {
    private readonly prisma;
    private readonly s3;
    constructor(prisma: PrismaService, s3: S3Service);
    searchClinics(query: DirectorySearchQuery, res: Response): Promise<{
        data: {
            id: string;
            name: string;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            phone: string | null;
            logo_url: string | null;
            clinic_description: string | null;
            specialties: string | null;
            working_hours_label: string | null;
            google_maps_url: string | null;
            website_url: string | null;
            users: {
                id: string;
                name: string;
                profile_photo_url: string | null;
                years_experience: number | null;
                specializations: import("@prisma/client/runtime/client").JsonValue;
            }[];
            review_count: number;
            avg_rating: number | null;
            distance_km: number | null;
            available_today: boolean;
            open_now: boolean;
            opens_at: string | null;
            closes_at: string | null;
            total_slots_today: number | null;
            available_slots_today: number | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
        };
    }>;
    getClinicDetail(clinicId: string): Promise<{
        branches: {
            photo_url: string | null;
            id: string;
            name: string;
            phone: string | null;
            address: string | null;
            city: string | null;
            latitude: number | null;
            longitude: number | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            working_days: string | null;
        }[];
        users: undefined;
        doctors: {
            profile_photo_url: string | null;
            directory_reviews: undefined;
            review_count: number;
            avg_rating: number | null;
            consultation_fee: number | null;
            id: string;
            name: string;
            languages_spoken: string | null;
            bio: string | null;
            years_experience: number | null;
            education: import("@prisma/client/runtime/client").JsonValue;
            specializations: import("@prisma/client/runtime/client").JsonValue;
        }[];
        reviews: {
            total: number;
            avg_overall: number | null;
            avg_cleanliness: number | null;
            avg_staff: number | null;
            avg_wait_time: number | null;
            avg_value: number | null;
            distribution: Record<number, number>;
            recent: {
                id: string;
                created_at: Date;
                comment: string | null;
                doctor: {
                    name: string;
                } | null;
                reviewer_name: string;
                overall_rating: number;
                cleanliness_rating: number | null;
                staff_rating: number | null;
                wait_time_rating: number | null;
                value_rating: number | null;
                is_verified: boolean;
            }[];
        };
        id: string;
        email: string;
        name: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        logo_url: string | null;
        clinic_description: string | null;
        specialties: string | null;
        latitude: number | null;
        longitude: number | null;
        working_hours_label: string | null;
        established_year: number | null;
        languages_spoken: string | null;
        directory_treatments: string | null;
        gallery_images: string | null;
        website_url: string | null;
        google_maps_url: string | null;
    }>;
    getClinicReviews(clinicId: string, query: ReviewSortQuery): Promise<{
        data: {
            id: string;
            created_at: Date;
            comment: string | null;
            doctor: {
                name: string;
            } | null;
            reviewer_name: string;
            overall_rating: number;
            cleanliness_rating: number | null;
            staff_rating: number | null;
            wait_time_rating: number | null;
            value_rating: number | null;
            is_verified: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
        };
    }>;
    submitReview(token: string, dto: SubmitReviewDto): Promise<{
        success: boolean;
        message: string;
        review_id: string;
    }>;
    createReviewToken(clinicId: string, appointmentId: string, doctorId?: string): Promise<string>;
}
export {};
