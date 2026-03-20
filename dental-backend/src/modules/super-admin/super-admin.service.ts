import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { CreateSuperAdminDto } from './dto/index.js';
import { SuperAdmin } from '@prisma/client';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(dto: CreateSuperAdminDto): Promise<Omit<SuperAdmin, 'password_hash'>> {
    const existing = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Super admin with email "${dto.email}" already exists`);
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

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findUnique({ where: { email } });
  }

  async findOne(id: string): Promise<Omit<SuperAdmin, 'password_hash'>> {
    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`Super admin not found`);
    }
    const { password_hash: _, ...result } = admin;
    return result;
  }

  // ─── Dashboard Stats ───

  async getDashboardStats() {
    const [
      totalClinics,
      activeClinics,
      trialClinics,
      expiredClinics,
      totalPlans,
      totalFeatures,
      totalPatients,
      totalAppointments,
      recentClinics,
    ] = await Promise.all([
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

    // Revenue estimate: count of active clinics per plan
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

  // ─── Clinics Management ───

  async listClinics(params: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where['subscription_status'] = status;
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

  async getClinicDetail(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        plan: { include: { plan_features: { include: { feature: true } } } },
        branches: true,
        users: { select: { id: true, name: true, email: true, role: true, status: true, created_at: true } },
        _count: { select: { patients: true, appointments: true, invoices: true } },
      },
    });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  // ─── Onboard Clinic (Super Admin manually creates clinic + admin user) ───

  async onboardClinic(dto: {
    clinic_name: string;
    clinic_email: string;
    clinic_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
    plan_id?: string;
  }) {
    const existingClinic = await this.prisma.clinic.findFirst({
      where: { email: dto.clinic_email },
    });
    if (existingClinic) throw new ConflictException('A clinic with this email already exists');

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

  // ─── Delete Clinic ───

  async deleteClinic(id: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    // All child relations use onDelete: Cascade, so deleting the clinic
    // automatically removes all associated data (users, patients, etc.)
    await this.prisma.clinic.delete({ where: { id } });

    return { deleted: true, clinic_name: clinic.name };
  }

  // ─── Change Password ───

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Super admin not found');

    const valid = await this.passwordService.verify(currentPassword, admin.password_hash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await this.passwordService.hash(newPassword);
    await this.prisma.superAdmin.update({
      where: { id: adminId },
      data: { password_hash: newHash },
    });

    return { message: 'Password changed successfully' };
  }

  // ─── Audit Logs ───

  async getAuditLogs(params: { page: number; limit: number; clinicId?: string; action?: string }) {
    const { page, limit, clinicId, action } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (clinicId) where['clinic_id'] = clinicId;
    if (action) where['action'] = action;

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
}
