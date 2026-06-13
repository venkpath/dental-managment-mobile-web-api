import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { OtpService } from './otp.service.js';
import { AppointmentReminderProducer } from '../appointment/appointment-reminder.producer.js';
import { AppointmentNotificationService } from '../appointment/appointment-notification.service.js';
import { PatientInsightsService } from '../patient-insights/patient-insights.service.js';
declare class BookAppointmentDto {
    first_name: string;
    last_name: string;
    phone: string;
    gender: string;
    email?: string;
    dentist_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    notes?: string;
    otp_token?: string;
}
declare class SendOtpDto {
    phone: string;
}
declare class VerifyOtpDto {
    phone: string;
    otp: string;
}
export declare class PublicBookingController {
    private readonly prisma;
    private readonly reminderProducer;
    private readonly notificationService;
    private readonly s3;
    private readonly config;
    private readonly otpService;
    private readonly patientInsightsService;
    private readonly logger;
    constructor(prisma: PrismaService, reminderProducer: AppointmentReminderProducer, notificationService: AppointmentNotificationService, s3: S3Service, config: ConfigService, otpService: OtpService, patientInsightsService: PatientInsightsService);
    resolveShortCode(code: string): Promise<{
        clinic_id: string;
        branch_id: string;
    }>;
    getBranchBookingInfo(clinicId: string, branchId: string): Promise<{
        clinic: {
            id: string;
            email: string;
            name: string;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
        };
        branch: {
            id: string;
            name: string;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            phone: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            working_hours: {
                start: string;
                end: string;
                lunch_start: string | null;
                lunch_end: string | null;
                working_days: string;
            };
            slot_duration: number;
        };
        booking_url: string;
        has_custom_booking: boolean;
    }>;
    getDentists(clinicId: string, branchId: string): Promise<{
        id: string;
        name: string;
        role: string;
        years_experience: number | null;
        specializations: import("@prisma/client/runtime/client").JsonArray;
        profile_photo_url: string | null;
        avg_rating: number | null;
        review_count: number;
    }[]>;
    getAvailableSlots(clinicId: string, branchId: string, dentistId: string, date: string): Promise<{
        start_time: string;
        end_time: string;
        available: boolean;
    }[]>;
    sendOtp(clinicId: string, dto: SendOtpDto): Promise<{
        sent: boolean;
        channel: string;
        dev_otp?: undefined;
    } | {
        sent: boolean;
        channel: string;
        dev_otp: string;
    }>;
    verifyOtp(clinicId: string, dto: VerifyOtpDto): Promise<{
        verified: boolean;
        token: string;
    }>;
    bookAppointment(clinicId: string, branchId: string, dto: BookAppointmentDto): Promise<{
        success: boolean;
        message: string;
        appointment: {
            id: string;
            date: Date;
            start_time: string;
            end_time: string;
            dentist: string;
            patient: string;
        };
    }>;
    private trySendOtpViaWhatsApp;
}
export {};
