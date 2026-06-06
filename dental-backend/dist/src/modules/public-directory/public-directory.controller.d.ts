import { ListingVerificationService } from './listing-verification.service.js';
import { ListingOtpService } from './listing-otp.service.js';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '@prisma/client';
import { S3Service } from '../../common/services/s3.service.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailProvider } from '../communication/providers/email.provider.js';
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
declare class SendPhoneOtpDto {
    phone: string;
}
declare class VerifyPhoneOtpDto {
    phone: string;
    code: string;
}
declare class SendEmailOtpDto {
    email: string;
    phone_token: string;
}
declare class VerifyEmailOtpDto {
    email: string;
    code: string;
}
declare class SubmitListingDto {
    phone_token: string;
    email_token: string;
    accepted_terms: boolean;
    clinic_name: string;
    contact_name: string;
    address: string;
    city: string;
    state: string;
    pincode?: string;
    google_maps_url?: string;
    latitude?: number;
    longitude?: number;
    specialties: string[];
    treatments: string[];
    working_hours_label?: string;
    languages_spoken: string;
    website_url?: string;
    clinic_description?: string;
    verification_document_type?: 'clinic_photo' | 'prescription_pad' | 'invoice' | 'other';
    verification_upload_token?: string;
    dentist_photo_upload_token: string;
    years_experience: number;
    established_year: number;
    clinic_image_upload_token?: string;
    working_days: number[];
    working_start_time: string;
    working_end_time: string;
}
declare class StagePendingVerificationDto {
    verification_document_type: 'clinic_photo' | 'prescription_pad' | 'invoice' | 'other' | 'dentist_photo' | 'clinic_image';
}
declare class DiscardPendingVerificationDto {
    upload_token: string;
}
export declare class PublicDirectoryController {
    private readonly prisma;
    private readonly s3;
    private readonly config;
    private readonly jwt;
    private readonly listingVerification;
    private readonly listingOtp;
    private readonly emailProvider;
    private readonly logger;
    constructor(prisma: PrismaService, s3: S3Service, config: ConfigService, jwt: JwtService, listingVerification: ListingVerificationService, listingOtp: ListingOtpService, emailProvider: EmailProvider);
    private ensurePlatformEmail;
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
                profile_photo_url: string | null;
                id: string;
                name: string;
                years_experience: number | null;
                specializations: Prisma.JsonValue;
            }[];
            branch_cover_id: string | null;
            branch_cover_photo_url: string | null;
            lat: number | null;
            lng: number | null;
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
    listForSitemap(res: Response): Promise<{
        id: string;
        updated_at: Date;
    }[]>;
    getFeaturedClinics(res: Response): Promise<{
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
            profile_photo_url: string | null;
            id: string;
            name: string;
            years_experience: number | null;
            specializations: Prisma.JsonValue;
        }[];
        branch_cover_id: string | null;
        branch_cover_photo_url: string | null;
        review_count: number;
        avg_rating: number | null;
        available_today: boolean;
        open_now: boolean;
    }[]>;
    getClinicDetail(clinicId: string): Promise<{
        directory_clinic_image_url: undefined;
        clinic_cover_photo_url: string | null;
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
            education: Prisma.JsonValue;
            specializations: Prisma.JsonValue;
            treatments_offered: Prisma.JsonValue;
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
                reviewer_name: string;
                comment: string | null;
                overall_rating: number;
                cleanliness_rating: number | null;
                staff_rating: number | null;
                wait_time_rating: number | null;
                value_rating: number | null;
                is_verified: boolean;
                doctor: {
                    name: string;
                } | null;
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
            reviewer_name: string;
            comment: string | null;
            overall_rating: number;
            cleanliness_rating: number | null;
            staff_rating: number | null;
            wait_time_rating: number | null;
            value_rating: number | null;
            is_verified: boolean;
            doctor: {
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
    getReviewToken(token: string): Promise<{
        clinic_name: string;
        clinic_city: string | null;
        doctor_name: string | null;
        patient_name: string | null;
    }>;
    submitReview(token: string, dto: SubmitReviewDto): Promise<{
        success: boolean;
        message: string;
        review_id: string;
    }>;
    sendListingPhoneOtp(dto: SendPhoneOtpDto): Promise<{
        message: string;
    }>;
    verifyListingPhoneOtp(dto: VerifyPhoneOtpDto): Promise<{
        verified: boolean;
        token: string;
        message: string;
    }>;
    sendListingEmailOtp(dto: SendEmailOtpDto): Promise<{
        message: string;
    }>;
    verifyListingEmailOtp(dto: VerifyEmailOtpDto): Promise<{
        verified: boolean;
        token: string;
        message: string;
    }>;
    stagePendingVerification(file: Express.Multer.File, dto: StagePendingVerificationDto): Promise<{
        upload_token: string;
        expires_in_minutes: number;
    }>;
    discardPendingVerification(dto: DiscardPendingVerificationDto): Promise<{
        discarded: boolean;
    }>;
    submitListing(file: Express.Multer.File | undefined, dto: SubmitListingDto): Promise<{
        success: boolean;
        message: string;
        clinic_id?: undefined;
    } | {
        success: boolean;
        clinic_id: string;
        message: string;
    }>;
    private notifySuperAdmin;
    private notifyClinicOfNewReview;
    createReviewToken(clinicId: string, appointmentId: string, doctorId?: string): Promise<string>;
}
export {};
