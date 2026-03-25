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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const password_service_js_1 = require("../../common/services/password.service.js");
let SuperAdminService = class SuperAdminService {
    prisma;
    passwordService;
    constructor(prisma, passwordService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
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
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        const passwordHash = await this.passwordService.hash(dto.admin_password);
        return this.prisma.$transaction(async (tx) => {
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
                    subscription_status: dto.plan_id ? 'active' : 'trial',
                    trial_ends_at: dto.plan_id ? null : trialEndsAt,
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
exports.SuperAdminService = SuperAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        password_service_js_1.PasswordService])
], SuperAdminService);
//# sourceMappingURL=super-admin.service.js.map