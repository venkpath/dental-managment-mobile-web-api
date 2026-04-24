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
const prisma_service_js_1 = require("../../database/prisma.service.js");
const password_service_js_1 = require("../../common/services/password.service.js");
const email_provider_js_1 = require("../communication/providers/email.provider.js");
const PLATFORM_CLINIC_ID = '__platform__';
let SuperAdminService = SuperAdminService_1 = class SuperAdminService {
    prisma;
    passwordService;
    emailProvider;
    config;
    logger = new common_1.Logger(SuperAdminService_1.name);
    adminEmail;
    frontendUrl;
    constructor(prisma, passwordService, emailProvider, config) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.emailProvider = emailProvider;
        this.config = config;
        this.adminEmail = this.config.get('app.adminEmail', 'prasanthshanmugam10@gmail.com');
        this.frontendUrl = this.config.get('app.frontendUrl', 'http://localhost:3001');
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
            where: { subscription_status: 'active', plan_id: { not: null } },
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
                users: { select: { id: true, name: true, email: true, role: true, status: true, created_at: true } },
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
                    password_hash: passwordHash,
                    role: 'Admin',
                    clinic_id: clinic.id,
                    branch_id: branch.id,
                },
                select: { id: true, name: true, email: true, role: true },
            });
            return { clinic, branch, admin: user };
        });
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
    async deleteClinic(id) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        await this.prisma.clinic.delete({ where: { id } });
        return { deleted: true, clinic_name: clinic.name };
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
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = SuperAdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        password_service_js_1.PasswordService,
        email_provider_js_1.EmailProvider,
        config_1.ConfigService])
], SuperAdminService);
//# sourceMappingURL=super-admin.service.js.map