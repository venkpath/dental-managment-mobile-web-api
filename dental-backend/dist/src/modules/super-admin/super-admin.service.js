"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SuperAdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const password_service_js_1 = require("../../common/services/password.service.js");
const email_provider_js_1 = require("../communication/providers/email.provider.js");
const whatsapp_provider_js_1 = require("../communication/providers/whatsapp.provider.js");
const automation_service_js_1 = require("../automation/automation.service.js");
const phone_util_js_1 = require("../../common/utils/phone.util.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const listing_verification_service_js_1 = require("../public-directory/listing-verification.service.js");
const PLATFORM_CLINIC_ID = '__platform__';
let SuperAdminService = SuperAdminService_1 = class SuperAdminService {
    prisma;
    passwordService;
    emailProvider;
    whatsapp;
    config;
    automationService;
    s3;
    logger = new common_1.Logger(SuperAdminService_1.name);
    adminEmail;
    adminPhone;
    frontendUrl;
    constructor(prisma, passwordService, emailProvider, whatsapp, config, automationService, s3) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.emailProvider = emailProvider;
        this.whatsapp = whatsapp;
        this.config = config;
        this.automationService = automationService;
        this.s3 = s3;
        this.adminEmail = this.config.get('app.adminEmail', 'prasanthshanmugam10@gmail.com');
        this.adminPhone = this.config.get('app.adminWhatsappPhone', '916366767512');
        this.frontendUrl = this.config.get('app.frontendUrl', 'http://localhost:3001');
    }
    ensureWhatsAppConfigured() {
        if (this.whatsapp.isConfigured(PLATFORM_CLINIC_ID))
            return true;
        const accessToken = this.config.get('app.whatsapp.accessToken');
        const phoneNumberId = this.config.get('app.whatsapp.phoneNumberId');
        if (accessToken && phoneNumberId) {
            this.whatsapp.configure(PLATFORM_CLINIC_ID, {
                accessToken,
                phoneNumberId,
                wabaId: this.config.get('app.whatsapp.wabaId') || '',
            }, 'meta-cloud-env');
            return true;
        }
        this.logger.warn('WhatsApp not configured — clinic-signup WhatsApp messages will be skipped');
        return false;
    }
    async sendSignupApprovedWhatsApp(phone, adminName, clinicName) {
        if (!phone || !this.ensureWhatsAppConfigured())
            return;
        await this.whatsapp.send({
            to: phone,
            body: `Your clinic ${clinicName} has been approved on Smart Dental Desk. Sign in at ${this.frontendUrl}/login`,
            templateId: 'clinic_signup_approved',
            variables: { '1': adminName, '2': clinicName },
            language: 'en',
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendSignupAdminAlertWhatsApp(clinicName, adminName, email, phone) {
        if (!this.ensureWhatsAppConfigured())
            return;
        await this.whatsapp.send({
            to: this.adminPhone,
            body: `New clinic signup: ${clinicName} — ${adminName} (${email}, ${phone})`,
            templateId: 'clinic_signup_admin_alert',
            variables: { '1': clinicName, '2': adminName, '3': email, '4': phone || 'Not provided' },
            language: 'en',
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    ensureEmailConfigured() {
        if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID))
            return true;
        const host = this.config.get('app.smtp.host');
        const user = this.config.get('app.smtp.user');
        if (host && user) {
            this.emailProvider.configure(PLATFORM_CLINIC_ID, {
                host,
                port: this.config.get('app.smtp.port') || 587,
                user,
                pass: this.config.get('app.smtp.pass') || '',
                from: this.config.get('app.smtp.from') || user,
                secure: this.config.get('app.smtp.secure') || false,
            }, 'smtp-env');
            return true;
        }
        this.logger.warn('SMTP not configured — onboarding emails will be skipped');
        return false;
    }
    async create(dto) {
        const existing = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.ConflictException(`Super admin with email "${dto.email}" already exists`);
        }
        const passwordHash = await this.passwordService.hash(dto.password);
        const admin = await this.prisma.superAdmin.create({
            data: {
                name: dto.name,
                email: dto.email,
                password_hash: passwordHash,
            },
        });
        const { password_hash: _, ...result } = admin;
        return result;
    }
    async findByEmail(email) {
        return this.prisma.superAdmin.findUnique({ where: { email } });
    }
    async findOne(id) {
        const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
        if (!admin) {
            throw new common_1.NotFoundException(`Super admin not found`);
        }
        const { password_hash: _, ...result } = admin;
        return result;
    }
    async getDashboardStats() {
        const [totalClinics, activeClinics, trialClinics, expiredClinics, totalPlans, totalFeatures, totalPatients, totalAppointments, recentClinics,] = await Promise.all([
            this.prisma.clinic.count(),
            this.prisma.clinic.count({ where: { subscription_status: 'active' } }),
            this.prisma.clinic.count({ where: { subscription_status: 'trial' } }),
            this.prisma.clinic.count({ where: { subscription_status: { in: ['expired', 'cancelled'] } } }),
            this.prisma.plan.count(),
            this.prisma.feature.count(),
            this.prisma.patient.count(),
            this.prisma.appointment.count(),
            this.prisma.clinic.findMany({
                take: 5,
                orderBy: { created_at: 'desc' },
                include: { plan: { select: { name: true } } },
            }),
        ]);
        const revenueByPlan = await this.prisma.clinic.groupBy({
            by: ['plan_id'],
            where: {
                subscription_status: 'active',
                plan_id: { not: null },
                is_complimentary: false,
            },
            _count: true,
        });
        const plans = await this.prisma.plan.findMany();
        const planMap = new Map(plans.map((p) => [p.id, p]));
        const monthlyRevenue = revenueByPlan.reduce((sum, r) => {
            const plan = r.plan_id ? planMap.get(r.plan_id) : null;
            return sum + (plan ? Number(plan.price_monthly) * r._count : 0);
        }, 0);
        return {
            total_clinics: totalClinics,
            active_clinics: activeClinics,
            trial_clinics: trialClinics,
            expired_clinics: expiredClinics,
            total_plans: totalPlans,
            total_features: totalFeatures,
            total_patients: totalPatients,
            total_appointments: totalAppointments,
            estimated_monthly_revenue: monthlyRevenue,
            recent_clinics: recentClinics,
        };
    }
    async listClinics(params) {
        const { status, search, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where['subscription_status'] = status;
        if (search) {
            where['OR'] = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [clinics, total] = await Promise.all([
            this.prisma.clinic.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    plan: { select: { id: true, name: true, price_monthly: true } },
                    _count: { select: { users: true, branches: true, patients: true } },
                },
            }),
            this.prisma.clinic.count({ where }),
        ]);
        return { data: clinics, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getClinicDetail(id) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id },
            include: {
                plan: { include: { plan_features: { include: { feature: true } } } },
                branches: true,
                users: { select: { id: true, name: true, email: true, phone: true, role: true, status: true, created_at: true } },
                _count: { select: { patients: true, appointments: true, invoices: true } },
            },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        return clinic;
    }
    async onboardClinic(dto) {
        const existingClinic = await this.prisma.clinic.findFirst({
            where: { email: dto.clinic_email },
        });
        if (existingClinic)
            throw new common_1.ConflictException('A clinic with this email already exists');
        let isFreePlan = false;
        if (dto.plan_id) {
            const plan = await this.prisma.plan.findUnique({ where: { id: dto.plan_id } });
            if (plan)
                isFreePlan = plan.name.toLowerCase() === 'free';
        }
        const trialEndsAt = !dto.plan_id || isFreePlan
            ? null
            : (() => {
                const d = new Date();
                d.setDate(d.getDate() + 14);
                return d;
            })();
        const subscriptionStatus = (dto.plan_id && !isFreePlan) || isFreePlan ? 'active' : 'trial';
        const billingCycle = dto.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
        const passwordHash = await this.passwordService.hash(dto.admin_password);
        const result = await this.prisma.$transaction(async (tx) => {
            const clinic = await tx.clinic.create({
                data: {
                    name: dto.clinic_name,
                    email: dto.clinic_email,
                    phone: dto.clinic_phone,
                    address: dto.address,
                    city: dto.city,
                    state: dto.state,
                    country: dto.country,
                    plan_id: dto.plan_id || null,
                    subscription_status: subscriptionStatus,
                    billing_cycle: billingCycle,
                    trial_ends_at: trialEndsAt,
                    has_own_waba: dto.has_own_waba ?? false,
                },
            });
            const branch = await tx.branch.create({
                data: { name: 'Main Branch', clinic_id: clinic.id },
            });
            const user = await tx.user.create({
                data: {
                    name: dto.admin_name,
                    email: dto.admin_email,
                    phone: dto.admin_phone,
                    password_hash: passwordHash,
                    role: 'SuperAdmin',
                    is_doctor: dto.is_doctor ?? false,
                    clinic_id: clinic.id,
                    branch_id: branch.id,
                },
                select: { id: true, name: true, email: true, role: true },
            });
            return { clinic, branch, admin: user };
        });
        await this.automationService.seedClinicAutomationDefaults(result.clinic.id);
        this.sendOnboardingWelcomeEmail({
            admin_name: result.admin.name,
            admin_email: result.admin.email,
            admin_password: dto.admin_password,
            clinic_name: result.clinic.name,
            subscription_status: result.clinic.subscription_status,
            trial_ends_at: result.clinic.trial_ends_at,
        }).catch((err) => this.logger.warn(`Failed to send onboarding welcome email: ${err.message}`));
        this.sendOnboardingAdminAlertEmail({
            clinic_name: result.clinic.name,
            clinic_email: result.clinic.email,
            clinic_phone: result.clinic.phone,
            city: result.clinic.city,
            state: result.clinic.state,
            country: result.clinic.country,
            subscription_status: result.clinic.subscription_status,
            trial_ends_at: result.clinic.trial_ends_at,
            admin_name: result.admin.name,
            admin_email: result.admin.email,
            created_at: result.clinic.created_at,
        }).catch((err) => this.logger.warn(`Failed to send onboarding admin alert email: ${err.message}`));
        this.sendSignupApprovedWhatsApp(dto.admin_phone, result.admin.name, result.clinic.name).catch((err) => this.logger.warn(`Onboarding approval WhatsApp failed: ${err.message}`));
        this.sendSignupAdminAlertWhatsApp(result.clinic.name, result.admin.name, result.admin.email, dto.admin_phone).catch((err) => this.logger.warn(`Onboarding admin alert WhatsApp failed: ${err.message}`));
        return result;
    }
    async sendOnboardingWelcomeEmail(data) {
        if (!this.ensureEmailConfigured())
            return;
        const loginUrl = `${this.frontendUrl}/login`;
        const planLine = data.subscription_status === 'trial' && data.trial_ends_at
            ? `You're on a <strong>14-day free trial</strong> that ends on <strong>${data.trial_ends_at.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.`
            : `Your subscription is <strong>active</strong>.`;
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Welcome to Smart Dental Desk</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.admin_name},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Your clinic <strong>${data.clinic_name}</strong> is now set up on Smart Dental Desk. ${planLine}
          </p>
          <p style="color: #4b5563; line-height: 1.6;">Here are your login details:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #1f2937;"><strong>Email:</strong> ${data.admin_email}</p>
            <p style="margin: 4px 0; color: #1f2937;"><strong>Temporary password:</strong> ${data.admin_password}</p>
          </div>
          <p style="color: #dc2626; line-height: 1.6; font-size: 14px;">
            For security, please sign in and change your password immediately.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${loginUrl}" style="background: #0ea5e9; color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Sign In</a>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">Getting started:</p>
          <ul style="color: #4b5563; line-height: 1.8;">
            <li>Add your branch details and operating hours</li>
            <li>Invite your dentists and staff</li>
            <li>Configure communication channels (SMS, email, WhatsApp)</li>
            <li>Start adding patients and booking appointments</li>
          </ul>
          <p style="color: #4b5563; line-height: 1.6;">
            If you have any questions, just reply to this email — we're happy to help.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Smart Dental Desk — Modern dental practice management<br/>
            <a href="https://smartdentaldesk.com" style="color: #6366f1;">smartdentaldesk.com</a>
          </p>
        </div>
      </div>`;
        await this.emailProvider.send({
            to: data.admin_email,
            subject: `Welcome to Smart Dental Desk — ${data.clinic_name}`,
            body: `Hi ${data.admin_name}, your clinic ${data.clinic_name} is now set up on Smart Dental Desk. Login email: ${data.admin_email}. Temporary password: ${data.admin_password}. Sign in at ${loginUrl} and change your password immediately.`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
        this.logger.log(`Onboarding welcome email sent to ${data.admin_email}`);
    }
    async sendOnboardingAdminAlertEmail(data) {
        if (!this.ensureEmailConfigured())
            return;
        const location = [data.city, data.state, data.country].filter(Boolean).join(', ') || 'Not specified';
        const planLabel = data.subscription_status === 'trial' && data.trial_ends_at
            ? `Trial (ends ${data.trial_ends_at.toLocaleDateString('en-IN')})`
            : data.subscription_status;
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 20px 32px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #fff; margin: 0;">New Clinic Onboarded</h2>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Clinic</td><td style="padding: 8px 0; font-weight: 600;">${data.clinic_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Clinic Email</td><td style="padding: 8px 0;"><a href="mailto:${data.clinic_email}">${data.clinic_email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Clinic Phone</td><td style="padding: 8px 0;">${data.clinic_phone || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Location</td><td style="padding: 8px 0;">${location}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Subscription</td><td style="padding: 8px 0;">${planLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Admin</td><td style="padding: 8px 0;">${data.admin_name} &lt;${data.admin_email}&gt;</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Onboarded At</td><td style="padding: 8px 0;">${data.created_at.toLocaleString('en-IN')}</td></tr>
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <a href="${this.frontendUrl}/super-admin/clinics" style="background: #6366f1; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
          </div>
        </div>
      </div>`;
        await this.emailProvider.send({
            to: this.adminEmail,
            subject: `New Clinic Onboarded: ${data.clinic_name} (${planLabel})`,
            body: `New clinic onboarded: ${data.clinic_name} (${data.clinic_email}). Admin: ${data.admin_name} <${data.admin_email}>. Subscription: ${planLabel}. Location: ${location}.`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
        this.logger.log(`Onboarding admin alert email sent to ${this.adminEmail}`);
    }
    async getDirectoryApprovals(status = 'pending') {
        return this.prisma.clinic.findMany({
            where: status === 'pending'
                ? { directory_approval_status: 'pending' }
                : { directory_approval_status: { in: ['pending', 'rejected'] } },
            select: {
                id: true, name: true, email: true, phone: true,
                city: true, state: true, country: true,
                directory_approval_status: true,
                directory_rejection_reason: true,
                directory_requested_at: true,
                clinic_description: true,
                specialties: true,
                created_at: true,
                is_directory_only: true,
                directory_contact_name: true,
                directory_verification_document_url: true,
                directory_verification_document_type: true,
                directory_dentist_photo_url: true,
                directory_clinic_image_url: true,
                directory_dentist_years_experience: true,
                established_year: true,
                directory_working_days: true,
                directory_working_start_time: true,
                directory_working_end_time: true,
            },
            orderBy: { directory_requested_at: 'asc' },
        });
    }
    async getDirectoryVerificationDocumentUrl(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                id: true,
                name: true,
                directory_verification_document_url: true,
                directory_verification_document_type: true,
            },
        });
        if (!clinic?.directory_verification_document_url) {
            throw new common_1.NotFoundException('No verification document on file for this clinic');
        }
        const key = clinic.directory_verification_document_url;
        const url = await this.s3.getSignedUrl(key);
        const lower = key.toLowerCase();
        const is_pdf = lower.endsWith('.pdf');
        const content_type = is_pdf
            ? 'application/pdf'
            : lower.endsWith('.png')
                ? 'image/png'
                : lower.endsWith('.webp')
                    ? 'image/webp'
                    : 'image/jpeg';
        return {
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            document_type: clinic.directory_verification_document_type,
            url,
            content_type,
            is_pdf,
        };
    }
    async getDirectoryDentistPhotoUrl(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { id: true, name: true, directory_dentist_photo_url: true },
        });
        if (!clinic?.directory_dentist_photo_url) {
            throw new common_1.NotFoundException('No dentist profile photo on file for this listing');
        }
        const url = await this.s3.getSignedUrl(clinic.directory_dentist_photo_url);
        return {
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            url,
            content_type: this.contentTypeFromS3Key(clinic.directory_dentist_photo_url),
        };
    }
    async getDirectoryClinicImageUrl(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                id: true,
                name: true,
                directory_clinic_image_url: true,
                directory_dentist_photo_url: true,
            },
        });
        const imageKey = clinic?.directory_clinic_image_url || clinic?.directory_dentist_photo_url;
        if (!clinic || !imageKey) {
            throw new common_1.NotFoundException('No clinic cover image on file for this listing');
        }
        const url = await this.s3.getSignedUrl(imageKey);
        return {
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            url,
            content_type: this.contentTypeFromS3Key(imageKey),
            uses_dentist_photo_fallback: !clinic.directory_clinic_image_url,
        };
    }
    contentTypeFromS3Key(key) {
        const lower = key.toLowerCase();
        if (lower.endsWith('.png'))
            return 'image/png';
        if (lower.endsWith('.webp'))
            return 'image/webp';
        if (lower.endsWith('.pdf'))
            return 'application/pdf';
        return 'image/jpeg';
    }
    parseListingCsv(csv) {
        if (!csv?.trim())
            return [];
        return csv.split(',').map((s) => s.trim()).filter(Boolean);
    }
    dentistProfileFromListing(clinic) {
        const specializations = this.parseListingCsv(clinic.specialties);
        const treatmentsOffered = this.parseListingCsv(clinic.directory_treatments);
        const languages = clinic.languages_spoken?.trim().slice(0, 200) || undefined;
        return {
            specializations: specializations.length ? specializations : undefined,
            treatments_offered: treatmentsOffered.length ? treatmentsOffered : undefined,
            languages_spoken: languages,
        };
    }
    extFromS3Key(key) {
        const lower = key.toLowerCase();
        if (lower.endsWith('.png'))
            return 'png';
        if (lower.endsWith('.webp'))
            return 'webp';
        return 'jpg';
    }
    async promoteListingImageKey(sourceKey, destBase) {
        if (!sourceKey)
            return null;
        if (!sourceKey.startsWith(listing_verification_service_js_1.LISTING_PENDING_DOC_PREFIX))
            return sourceKey;
        const exists = await this.s3.objectExists(sourceKey);
        if (!exists) {
            this.logger.warn(`Listing image missing in S3 — skipping promote: ${sourceKey}`);
            return null;
        }
        const ext = this.extFromS3Key(sourceKey);
        const destKey = `${destBase}.${ext}`;
        const contentType = this.contentTypeFromS3Key(sourceKey);
        try {
            return await this.s3.moveObject(sourceKey, destKey, contentType);
        }
        catch (err) {
            this.logger.warn(`Failed to promote listing image ${sourceKey} → ${destKey}: ${err.message}`);
            return null;
        }
    }
    async seedDoctorAvailabilityFromListing(tx, userId, clinicId, workingDays, workingStart, workingEnd) {
        const availCount = await tx.doctorAvailability.count({ where: { user_id: userId } });
        if (availCount > 0)
            return;
        await tx.doctorAvailability.createMany({
            data: Array.from({ length: 7 }, (_, i) => ({
                user_id: userId,
                clinic_id: clinicId,
                day_of_week: i + 1,
                start_time: workingStart,
                end_time: workingEnd,
                is_day_off: workingDays.length > 0 ? !workingDays.includes(i + 1) : false,
            })),
        });
    }
    async getPendingSignups() {
        return this.prisma.clinic.findMany({
            where: { subscription_status: 'pending' },
            select: {
                id: true, name: true, email: true, phone: true,
                city: true, state: true, country: true, created_at: true,
                users: {
                    where: { role: 'SuperAdmin' },
                    select: { name: true, email: true, phone: true },
                    take: 1,
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async approveSignup(id, planKey) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id },
            include: { users: { where: { role: 'SuperAdmin' }, take: 1 } },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        if (clinic.subscription_status !== 'pending') {
            throw new common_1.BadRequestException('This clinic is not in pending status');
        }
        let planId;
        let targetStatus = 'trial';
        const key = planKey ?? 'free';
        const plan = await this.prisma.plan.findFirst({
            where: { name: { contains: key, mode: 'insensitive' } },
        });
        if (plan) {
            planId = plan.id;
            if (plan.name.toLowerCase() === 'free')
                targetStatus = 'active';
        }
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        await this.prisma.clinic.update({
            where: { id },
            data: {
                subscription_status: targetStatus,
                trial_ends_at: targetStatus === 'trial' ? trialEndsAt : undefined,
                ...(planId ? { plan_id: planId } : {}),
            },
        });
        if (clinic.email) {
            this.sendSignupApprovedEmail(clinic).catch((err) => this.logger.warn(`Signup approval email failed: ${err.message}`));
        }
        const admin = clinic.users[0];
        const adminPhone = admin?.phone ?? clinic.phone;
        this.sendSignupApprovedWhatsApp(adminPhone, admin?.name ?? clinic.name, clinic.name).catch((err) => this.logger.warn(`Signup approval WhatsApp failed: ${err.message}`));
        return { approved: true, clinic_name: clinic.name, status: targetStatus };
    }
    async rejectSignup(id, reason) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id },
            include: { users: { where: { role: 'SuperAdmin' }, take: 1 } },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        if (clinic.subscription_status !== 'pending') {
            throw new common_1.BadRequestException('This clinic is not in pending status');
        }
        await this.prisma.clinic.delete({ where: { id } });
        const adminEmail = clinic.users[0]?.email ?? clinic.email;
        if (adminEmail) {
            this.sendSignupRejectedEmail(adminEmail, clinic.name, reason).catch((err) => this.logger.warn(`Signup rejection email failed: ${err.message}`));
        }
        return { rejected: true, clinic_name: clinic.name };
    }
    async sendSignupApprovedEmail(clinic) {
        if (!clinic.email || !this.ensureEmailConfigured())
            return;
        const loginUrl = `${this.frontendUrl}/login`;
        const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#3b5bff,#6366f1);padding:32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Your account is approved! 🎉</h1>
        </div>
        <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;">
            Hi, great news! Your clinic <strong>${clinic.name}</strong> has been approved on Smart Dental Desk.
            You now have full access to the platform.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b5bff,#6366f1);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;">
              Sign In to Your Clinic →
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px;text-align:center;">
            Questions? Reply to this email or contact <a href="mailto:support@smartdentaldesk.com" style="color:#3b5bff;">support@smartdentaldesk.com</a>
          </p>
        </div>
      </div>
    `;
        await this.emailProvider.send({
            to: clinic.email,
            subject: `Your Smart Dental Desk account for "${clinic.name}" is approved`,
            body: `Your clinic ${clinic.name} has been approved. Sign in at ${loginUrl}`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendSignupRejectedEmail(to, clinicName, reason) {
        if (!this.ensureEmailConfigured())
            return;
        await this.emailProvider.send({
            to,
            clinicId: PLATFORM_CLINIC_ID,
            subject: `Update on your Smart Dental Desk application — ${clinicName}`,
            body: `We were unable to approve your application for ${clinicName}. Reason: ${reason}. Contact support@smartdentaldesk.com for assistance.`,
            html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#1f2937;">Update on your application</h2>
          <p style="color:#374151;">We were unable to approve the application for <strong>${clinicName}</strong> at this time.</p>
          ${reason ? `<p style="color:#374151;"><strong>Reason:</strong> ${reason}</p>` : ''}
          <p style="color:#374151;">If you believe this is an error, please contact us at <a href="mailto:support@smartdentaldesk.com">support@smartdentaldesk.com</a>.</p>
        </div>
      `,
        });
    }
    async approveDirectoryListing(id) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id },
            select: {
                id: true, name: true, email: true, phone: true,
                address: true, directory_approval_status: true,
                directory_contact_name: true,
                directory_verification_document_url: true,
                directory_dentist_photo_url: true,
                directory_clinic_image_url: true,
                directory_working_days: true,
                directory_working_start_time: true,
                directory_working_end_time: true,
                directory_dentist_years_experience: true,
                languages_spoken: true,
                specialties: true,
                directory_treatments: true,
            },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        if (clinic.directory_approval_status !== 'pending') {
            throw new common_1.BadRequestException('No pending directory approval request for this clinic');
        }
        const dentistProfile = this.dentistProfileFromListing(clinic);
        const freePlan = await this.prisma.plan.findFirst({
            where: { name: { equals: 'Free', mode: 'insensitive' } },
        });
        if (!freePlan) {
            throw new common_1.BadRequestException('Free plan is not configured. Please seed plans before approving listings.');
        }
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        const randomPassword = Array.from({ length: 12 }, () => chars[(0, crypto_1.randomInt)(0, chars.length)]).join('');
        const existingUser = await this.prisma.user.findFirst({
            where: { clinic_id: id },
            select: {
                id: true, role: true, profile_photo_url: true, years_experience: true,
                languages_spoken: true, specializations: true, treatments_offered: true,
            },
        });
        let createdNewUser = false;
        let approvedUserId = existingUser?.id ?? null;
        const workingDays = clinic.directory_working_days
            ? clinic.directory_working_days.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => d >= 1 && d <= 7)
            : [1, 2, 3, 4, 5, 6];
        const workingStart = clinic.directory_working_start_time || '09:00';
        const workingEnd = clinic.directory_working_end_time || '20:00';
        const listingCoverKey = clinic.directory_clinic_image_url || null;
        await this.prisma.$transaction(async (tx) => {
            let branch = await tx.branch.findFirst({ where: { clinic_id: id } });
            if (!branch) {
                branch = await tx.branch.create({
                    data: {
                        clinic_id: id,
                        name: 'Main Branch',
                        address: clinic.address || undefined,
                        phone: clinic.phone || undefined,
                        photo_url: listingCoverKey || undefined,
                        working_days: clinic.directory_working_days || '1,2,3,4,5,6',
                        working_start_time: workingStart,
                        working_end_time: workingEnd,
                    },
                });
            }
            else {
                await tx.branch.update({
                    where: { id: branch.id },
                    data: {
                        ...(!branch.photo_url && listingCoverKey ? { photo_url: listingCoverKey } : {}),
                        ...(!branch.working_days
                            ? {
                                working_days: clinic.directory_working_days || '1,2,3,4,5,6',
                                working_start_time: workingStart,
                                working_end_time: workingEnd,
                            }
                            : {}),
                    },
                });
            }
            const normalizedPhone = clinic.phone ? (0, phone_util_js_1.normalizePhoneE164)(clinic.phone) ?? clinic.phone : null;
            if (!existingUser && clinic.email) {
                const passwordHash = await this.passwordService.hash(randomPassword);
                const newUser = await tx.user.create({
                    data: {
                        clinic_id: id,
                        branch_id: branch.id,
                        name: clinic.directory_contact_name || clinic.name,
                        email: clinic.email,
                        phone: normalizedPhone,
                        password_hash: passwordHash,
                        role: 'SuperAdmin',
                        status: 'active',
                        email_verified: true,
                        phone_verified: !!normalizedPhone,
                        must_change_password: true,
                        is_doctor: true,
                        listed_in_directory: true,
                        profile_photo_url: clinic.directory_dentist_photo_url || undefined,
                        years_experience: clinic.directory_dentist_years_experience ?? undefined,
                        languages_spoken: dentistProfile.languages_spoken,
                        specializations: dentistProfile.specializations,
                        treatments_offered: dentistProfile.treatments_offered,
                    },
                    select: { id: true },
                });
                await this.seedDoctorAvailabilityFromListing(tx, newUser.id, id, workingDays, workingStart, workingEnd);
                approvedUserId = newUser.id;
                createdNewUser = true;
            }
            else if (existingUser?.role === 'SuperAdmin') {
                await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        is_doctor: true,
                        listed_in_directory: true,
                        ...(normalizedPhone
                            ? { phone: normalizedPhone, phone_verified: true }
                            : {}),
                        ...(clinic.directory_dentist_photo_url && !existingUser.profile_photo_url
                            ? { profile_photo_url: clinic.directory_dentist_photo_url }
                            : {}),
                        ...(clinic.directory_dentist_years_experience != null && existingUser.years_experience == null
                            ? { years_experience: clinic.directory_dentist_years_experience }
                            : {}),
                        languages_spoken: dentistProfile.languages_spoken,
                        specializations: dentistProfile.specializations,
                        treatments_offered: dentistProfile.treatments_offered,
                    },
                });
                await this.seedDoctorAvailabilityFromListing(tx, existingUser.id, id, workingDays, workingStart, workingEnd);
                approvedUserId = existingUser.id;
            }
            await tx.clinic.update({
                where: { id },
                data: {
                    plan_id: freePlan.id,
                    listed_in_directory: true,
                    directory_approval_status: 'approved',
                    directory_approved_at: new Date(),
                    directory_rejection_reason: null,
                    is_directory_only: false,
                    subscription_status: 'directory',
                    trial_ends_at: null,
                },
            });
        });
        try {
            const branch = await this.prisma.branch.findFirst({ where: { clinic_id: id }, select: { id: true, photo_url: true } });
            if (branch) {
                const dentistPending = clinic.directory_dentist_photo_url;
                const clinicPending = clinic.directory_clinic_image_url;
                const dentistKey = await this.promoteListingImageKey(dentistPending, `clinics/${id}/staff-photos/listing_dentist`);
                const clinicImageKey = await this.promoteListingImageKey(clinicPending, `clinics/${id}/branch-photos/${branch.id}`);
                const branchPhotoUpdate = clinicImageKey
                    ? clinicImageKey
                    : dentistPending?.startsWith(listing_verification_service_js_1.LISTING_PENDING_DOC_PREFIX)
                        ? null
                        : undefined;
                if (branchPhotoUpdate !== undefined) {
                    await this.prisma.branch.update({
                        where: { id: branch.id },
                        data: { photo_url: branchPhotoUpdate },
                    });
                }
                if (approvedUserId) {
                    const profileUpdate = dentistKey
                        ? dentistKey
                        : dentistPending?.startsWith(listing_verification_service_js_1.LISTING_PENDING_DOC_PREFIX)
                            ? null
                            : undefined;
                    if (profileUpdate !== undefined) {
                        await this.prisma.user.update({
                            where: { id: approvedUserId },
                            data: { profile_photo_url: profileUpdate },
                        });
                    }
                }
                await this.prisma.clinic.update({
                    where: { id },
                    data: {
                        ...(dentistKey
                            ? { directory_dentist_photo_url: dentistKey }
                            : dentistPending?.startsWith(listing_verification_service_js_1.LISTING_PENDING_DOC_PREFIX)
                                ? { directory_dentist_photo_url: null }
                                : {}),
                        ...(clinicImageKey
                            ? { directory_clinic_image_url: clinicImageKey }
                            : clinicPending?.startsWith(listing_verification_service_js_1.LISTING_PENDING_DOC_PREFIX)
                                ? { directory_clinic_image_url: null }
                                : {}),
                    },
                });
            }
        }
        catch (err) {
            this.logger.warn(`Directory listing approved for ${id} but image promotion failed: ${err.message}`);
        }
        this.automationService.seedClinicAutomationDefaults(id).catch((err) => this.logger.warn(`Failed to seed automation defaults for listing clinic ${id}: ${err.message}`));
        if (clinic.email && createdNewUser) {
            this.sendListingWelcomeEmail(clinic, randomPassword).catch((err) => this.logger.warn(`Listing welcome email failed: ${err.message}`));
        }
        else if (clinic.email && existingUser) {
            this.sendListingApprovedEmail(clinic).catch((err) => this.logger.warn(`Listing approved email failed: ${err.message}`));
        }
        return { approved: true, clinic_name: clinic.name, plan: 'Free' };
    }
    async sendListingWelcomeEmail(clinic, password) {
        if (!clinic.email || !this.ensureEmailConfigured())
            return;
        const loginUrl = `${this.frontendUrl}/login`;
        const contactName = clinic.directory_contact_name || 'Doctor';
        const loginId = clinic.email;
        const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#3b5bff,#1ec991);padding:32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Your clinic is live on Smart Dental Desk!</h1>
        </div>
        <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${contactName},</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;">
            <strong>${clinic.name}</strong> has been approved and is now live. We've created a <strong>Free plan</strong> account for you (always free, no trial) — log in to manage appointments, billing, records, and more.
          </p>
          <div style="background:#f8faff;border:1px solid #dbeafe;border-radius:10px;padding:20px;margin:24px 0;">
            <p style="color:#1e40af;font-size:13px;font-weight:700;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:0.05em;">Your Login Credentials</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px;">Login URL</td>
                <td style="padding:6px 0;color:#111827;font-size:13px;"><a href="${loginUrl}" style="color:#3b5bff;">${loginUrl}</a></td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;">Email</td>
                <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${loginId}</td>
              </tr>
              ${clinic.phone ? `<tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;">Mobile</td>
                <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${clinic.phone}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;">Password</td>
                <td style="padding:6px 0;color:#111827;font-size:18px;font-weight:700;letter-spacing:2px;">${password}</td>
              </tr>
            </table>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
            <p style="color:#92400e;font-size:13px;margin:0;">
              ⚠️ You will be asked to set a new password on your first login. You can also log in using an OTP sent to your email or mobile.
            </p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b5bff,#6366f1);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">Login to Your Dashboard →</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
            Smart Dental Desk · <a href="${this.frontendUrl}" style="color:#9ca3af;">smartdentaldesk.com</a>
          </p>
        </div>
      </div>
    `;
        await this.emailProvider.send({
            to: clinic.email,
            subject: `Your Smart Dental Desk account is ready — login credentials inside`,
            body: `Hi ${contactName}, your clinic "${clinic.name}" is approved. Login at ${loginUrl} with email: ${loginId} and password: ${password}. You will be asked to change your password on first login.`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async rejectDirectoryListing(id, reason) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        if (clinic.directory_approval_status !== 'pending') {
            throw new common_1.BadRequestException('No pending directory approval request for this clinic');
        }
        await this.prisma.clinic.update({
            where: { id },
            data: {
                listed_in_directory: false,
                directory_approval_status: 'rejected',
                directory_rejection_reason: reason.trim(),
            },
        });
        return { rejected: true, clinic_name: clinic.name };
    }
    async listFeaturedDirectoryClinics() {
        return this.prisma.clinic.findMany({
            where: { directory_featured: true },
            orderBy: [{ directory_featured_order: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                name: true,
                city: true,
                state: true,
                listed_in_directory: true,
                is_suspended: true,
                directory_featured_order: true,
            },
        });
    }
    async listFeaturedDirectoryCandidates(search) {
        const where = {
            listed_in_directory: true,
            is_suspended: false,
            directory_featured: false,
        };
        if (search?.trim()) {
            where['OR'] = [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { city: { contains: search.trim(), mode: 'insensitive' } },
                { email: { contains: search.trim(), mode: 'insensitive' } },
            ];
        }
        return this.prisma.clinic.findMany({
            where,
            take: 30,
            orderBy: { name: 'asc' },
            select: { id: true, name: true, city: true, state: true },
        });
    }
    async updateDirectoryFeatured(id, featured, order) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        if (featured) {
            if (!clinic.listed_in_directory) {
                throw new common_1.BadRequestException('Clinic must be listed in the public directory before it can be featured');
            }
            if (clinic.is_suspended) {
                throw new common_1.BadRequestException('Suspended clinics cannot be featured');
            }
            let assignedOrder = order;
            if (assignedOrder == null) {
                const max = await this.prisma.clinic.aggregate({
                    where: { directory_featured: true },
                    _max: { directory_featured_order: true },
                });
                assignedOrder = (max._max.directory_featured_order ?? 0) + 1;
            }
            return this.prisma.clinic.update({
                where: { id },
                data: { directory_featured: true, directory_featured_order: assignedOrder },
                select: {
                    id: true,
                    name: true,
                    directory_featured: true,
                    directory_featured_order: true,
                },
            });
        }
        return this.prisma.clinic.update({
            where: { id },
            data: { directory_featured: false, directory_featured_order: null },
            select: {
                id: true,
                name: true,
                directory_featured: true,
                directory_featured_order: true,
            },
        });
    }
    async reorderFeaturedDirectoryClinics(clinicIds) {
        if (!clinicIds.length) {
            throw new common_1.BadRequestException('clinic_ids must be a non-empty array');
        }
        const rows = await this.prisma.clinic.findMany({
            where: { id: { in: clinicIds }, directory_featured: true },
            select: { id: true },
        });
        if (rows.length !== clinicIds.length) {
            throw new common_1.BadRequestException('One or more clinics are not featured or do not exist');
        }
        await this.prisma.$transaction(clinicIds.map((clinicId, index) => this.prisma.clinic.update({
            where: { id: clinicId },
            data: { directory_featured_order: index + 1 },
        })));
        return { reordered: clinicIds.length };
    }
    async getWhatsAppConnectRequests(status = 'pending') {
        return this.prisma.clinic.findMany({
            where: status === 'pending'
                ? { whatsapp_connect_requested_at: { not: null }, whatsapp_connect_approved: false }
                : { OR: [{ whatsapp_connect_requested_at: { not: null } }, { whatsapp_connect_approved: true }] },
            select: {
                id: true, name: true, email: true, phone: true,
                city: true, state: true, country: true,
                whatsapp_connect_approved: true,
                whatsapp_connect_requested_at: true,
                whatsapp_connect_approved_at: true,
                has_own_waba: true,
                plan: { select: { name: true } },
                created_at: true,
            },
            orderBy: { whatsapp_connect_requested_at: 'asc' },
        });
    }
    async setWhatsAppConnectAccess(id, approved) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id },
            select: { id: true, name: true },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        await this.prisma.clinic.update({
            where: { id },
            data: {
                whatsapp_connect_approved: approved,
                whatsapp_connect_approved_at: approved ? new Date() : null,
            },
        });
        return { whatsapp_connect_approved: approved, clinic_name: clinic.name };
    }
    async sendListingApprovedEmail(clinic) {
        if (!clinic.email || !this.ensureEmailConfigured())
            return;
        const claimUrl = `${this.frontendUrl}/register?claim=${clinic.id}`;
        const profileUrl = `${this.frontendUrl}/find-dentist/${clinic.id}`;
        const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#14b8a6,#3b82f6);padding:32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">🎉 Your Clinic is Now Live!</h1>
        </div>
        <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;">
            Hi ${clinic.directory_contact_name || 'Doctor'},<br/><br/>
            <strong>${clinic.name}</strong> is now live on Smart Dental Desk. Patients can discover and contact you through our directory.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${profileUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">View Your Live Profile →</a>
          </div>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;"/>
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            Want to do more? Activate the full software — manage appointments, send WhatsApp reminders, generate GST invoices, and maintain patient records.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#166534;font-size:13px;margin:0 0 6px 0;font-weight:600;">✓ 14-day free trial — no credit card needed</p>
            <p style="color:#166534;font-size:13px;margin:0;">✓ Your clinic details are already pre-filled from your listing</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${claimUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b5bff,#6366f1);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">Activate Free Trial →</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
            Smart Dental Desk · <a href="${this.frontendUrl}" style="color:#9ca3af;">smartdentaldesk.com</a>
          </p>
        </div>
      </div>
    `;
        await this.emailProvider.send({
            to: clinic.email,
            subject: `Your clinic "${clinic.name}" is now live on Smart Dental Desk`,
            body: `Your clinic "${clinic.name}" is now live on Smart Dental Desk. View your profile or activate your free trial at ${claimUrl}`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async suspendClinic(id, reason) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        await this.prisma.clinic.update({
            where: { id },
            data: {
                is_suspended: true,
                suspended_at: new Date(),
                suspension_reason: reason?.trim() || 'Manually suspended by super admin',
            },
        });
        return { suspended: true, clinic_name: clinic.name };
    }
    async reactivateClinic(id) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        await this.prisma.clinic.update({
            where: { id },
            data: {
                is_suspended: false,
                suspended_at: null,
                suspension_reason: null,
                last_active_at: new Date(),
                inactivity_reminder_30_sent: false,
                inactivity_reminder_40_sent: false,
            },
        });
        return { reactivated: true, clinic_name: clinic.name };
    }
    async deleteClinic(id) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        await this.prisma.clinic.delete({ where: { id } });
        return { deleted: true, clinic_name: clinic.name };
    }
    async updateClinicLimits(clinicId, dto) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic ${clinicId} not found`);
        return this.prisma.clinic.update({
            where: { id: clinicId },
            data: {
                ...(dto.custom_max_branches !== undefined && { custom_max_branches: dto.custom_max_branches }),
                ...(dto.custom_max_staff !== undefined && { custom_max_staff: dto.custom_max_staff }),
                ...(dto.ai_quota_override !== undefined && { ai_quota_override: dto.ai_quota_override }),
                ...(dto.custom_patient_limit !== undefined && { custom_patient_limit: dto.custom_patient_limit }),
                ...(dto.custom_appointment_limit !== undefined && { custom_appointment_limit: dto.custom_appointment_limit }),
                ...(dto.custom_invoice_limit !== undefined && { custom_invoice_limit: dto.custom_invoice_limit }),
                ...(dto.custom_treatment_limit !== undefined && { custom_treatment_limit: dto.custom_treatment_limit }),
                ...(dto.custom_prescription_limit !== undefined && { custom_prescription_limit: dto.custom_prescription_limit }),
                ...(dto.custom_consultation_limit !== undefined && { custom_consultation_limit: dto.custom_consultation_limit }),
                ...(dto.custom_waba_monthly_limit !== undefined && { custom_waba_monthly_limit: dto.custom_waba_monthly_limit }),
            },
            select: {
                id: true,
                name: true,
                custom_max_branches: true,
                custom_max_staff: true,
                ai_quota_override: true,
                custom_patient_limit: true,
                custom_appointment_limit: true,
                custom_invoice_limit: true,
                custom_treatment_limit: true,
                custom_prescription_limit: true,
                custom_consultation_limit: true,
                custom_waba_monthly_limit: true,
                has_own_waba: true,
                plan: {
                    select: {
                        name: true,
                        max_branches: true,
                        max_staff: true,
                        ai_quota: true,
                        max_patients_per_month: true,
                        max_appointments_per_month: true,
                        max_invoices_per_month: true,
                        max_treatments_per_month: true,
                        max_prescriptions_per_month: true,
                        max_consultations_per_month: true,
                        whatsapp_hard_limit_monthly: true,
                    },
                },
            },
        });
    }
    async changePassword(adminId, currentPassword, newPassword) {
        const admin = await this.prisma.superAdmin.findUnique({ where: { id: adminId } });
        if (!admin)
            throw new common_1.NotFoundException('Super admin not found');
        const valid = await this.passwordService.verify(currentPassword, admin.password_hash);
        if (!valid)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        const newHash = await this.passwordService.hash(newPassword);
        await this.prisma.superAdmin.update({
            where: { id: adminId },
            data: { password_hash: newHash },
        });
        return { message: 'Password changed successfully' };
    }
    async getAuditLogs(params) {
        const { page, limit, clinicId, action } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (clinicId)
            where['clinic_id'] = clinicId;
        if (action)
            where['action'] = action;
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return { data: logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getGlobalSettings() {
        const settings = await this.prisma.globalSetting.findMany();
        return Object.fromEntries(settings.map((s) => [s.key, s.value]));
    }
    async updateGlobalSetting(key, value) {
        return this.prisma.globalSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
    async updateClinicAiQuota(clinicId, quota) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        return this.prisma.clinic.update({
            where: { id: clinicId },
            data: { ai_quota_override: quota },
            select: { id: true, name: true, ai_quota_override: true, ai_usage_count: true },
        });
    }
    async resetClinicAiUsage(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        return this.prisma.clinic.update({
            where: { id: clinicId },
            data: { ai_usage_count: 0 },
            select: { id: true, name: true, ai_usage_count: true },
        });
    }
    async listMessages(params) {
        const { channel, status, clinicId, from, toDate, page, limit } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (channel)
            where.channel = channel;
        if (status)
            where.status = status;
        if (clinicId)
            where.clinic_id = clinicId;
        if (from || toDate) {
            where.created_at = {
                ...(from ? { gte: new Date(from) } : {}),
                ...(toDate ? { lte: new Date(toDate + 'T23:59:59.999Z') } : {}),
            };
        }
        const [total, messages] = await Promise.all([
            this.prisma.communicationMessage.count({ where }),
            this.prisma.communicationMessage.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    clinic_id: true,
                    channel: true,
                    status: true,
                    recipient: true,
                    category: true,
                    created_at: true,
                    sent_at: true,
                    wa_message_id: true,
                    metadata: true,
                    clinic: { select: { name: true } },
                },
            }),
        ]);
        return {
            data: messages,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    }
    async messageStats(params) {
        const { channel, from, toDate } = params;
        const dateFilter = {};
        if (from || toDate) {
            dateFilter.created_at = {
                ...(from ? { gte: new Date(from) } : {}),
                ...(toDate ? { lte: new Date(toDate + 'T23:59:59.999Z') } : {}),
            };
        }
        const channelFilter = channel ? { channel } : {};
        const baseWhere = { ...channelFilter, ...dateFilter };
        const [total, byStatus, byChannel, byClinic, recentByDay] = await Promise.all([
            this.prisma.communicationMessage.count({ where: baseWhere }),
            this.prisma.communicationMessage.groupBy({
                by: ['status'],
                where: baseWhere,
                _count: { id: true },
            }),
            this.prisma.communicationMessage.groupBy({
                by: ['channel'],
                where: dateFilter,
                _count: { id: true },
            }),
            this.prisma.communicationMessage.groupBy({
                by: ['clinic_id'],
                where: baseWhere,
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
            channel
                ? this.prisma.$queryRaw `
            SELECT DATE("created_at") as day, COUNT(*) as count
            FROM "communication_messages"
            WHERE "created_at" >= NOW() - INTERVAL '7 days'
              AND "channel" = ${channel}
            GROUP BY DATE("created_at")
            ORDER BY day DESC
          `
                : this.prisma.$queryRaw `
            SELECT DATE("created_at") as day, COUNT(*) as count
            FROM "communication_messages"
            WHERE "created_at" >= NOW() - INTERVAL '7 days'
            GROUP BY DATE("created_at")
            ORDER BY day DESC
          `,
        ]);
        const clinicIds = byClinic.map((r) => r.clinic_id);
        const clinics = await this.prisma.clinic.findMany({
            where: { id: { in: clinicIds } },
            select: { id: true, name: true },
        });
        const clinicMap = Object.fromEntries(clinics.map((c) => [c.id, c.name]));
        return {
            total,
            byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count.id])),
            byChannel: Object.fromEntries(byChannel.map((r) => [r.channel, r._count.id])),
            topClinics: byClinic.map((r) => ({
                clinicId: r.clinic_id,
                clinicName: clinicMap[r.clinic_id] ?? r.clinic_id,
                count: r._count.id,
            })),
            dailyTrend: recentByDay.map((r) => ({ day: r.day, count: Number(r.count) })),
        };
    }
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = SuperAdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        password_service_js_1.PasswordService,
        email_provider_js_1.EmailProvider,
        whatsapp_provider_js_1.WhatsAppProvider,
        config_1.ConfigService,
        automation_service_js_1.AutomationService,
        s3_service_js_1.S3Service])
], SuperAdminService);
//# sourceMappingURL=super-admin.service.js.map