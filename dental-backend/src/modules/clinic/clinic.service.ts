import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ClinicFeatureService } from '../feature/clinic-feature.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { Clinic } from '@prisma/client';
import { decodeHtmlEntities } from '../../common/utils/name.util.js';

const TRIAL_DAYS = 14;

@Injectable()
export class ClinicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicFeatureService: ClinicFeatureService,
  ) {}

  async create(dto: CreateClinicDto): Promise<Clinic> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return this.prisma.clinic.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...dto,
        trial_ends_at: trialEndsAt,
      } as any,
    });
  }

  async findAll(): Promise<Clinic[]> {
    return this.prisma.clinic.findMany({
      orderBy: { created_at: 'desc' },
      include: { plan: true },
    });
  }

  async findOne(id: string): Promise<Clinic> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${id}" not found`);
    }
    return clinic;
  }

  async getFeatures(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        billing_cycle: true,
        plan: { select: { name: true, price_monthly: true } },
      },
    });

    if (!clinic) throw new NotFoundException(`Clinic with ID "${clinicId}" not found`);

    // Effective set = plan defaults merged with per-clinic feature + limit +
    // price overrides. The frontend uses these for UI gating; the backend
    // also enforces the same effective values (PlanLimitService,
    // FeatureGuard, AiUsageService, renewal cron), so the two stay in sync
    // from a single source.
    const billingCycle = (clinic.billing_cycle as 'monthly' | 'yearly') || 'monthly';
    const [features, limits, effectivePrice] = await Promise.all([
      this.clinicFeatureService.getEffectiveFeatureKeys(clinicId),
      this.clinicFeatureService.getEffectiveLimits(clinicId),
      this.clinicFeatureService.getEffectivePrice(clinicId, billingCycle),
    ]);

    return {
      plan: clinic.plan
        ? {
            name: clinic.plan.name,
            // price_monthly stays as the plan's list price so the UI can show
            // "Original ₹X" when a discount is active. effective_price /
            // discount fields below are the source of truth for what the
            // customer actually pays.
            price_monthly: Number(clinic.plan.price_monthly),
            effective_price: effectivePrice.amount,
            price_source: effectivePrice.source,
            custom_price_expires_at: effectivePrice.custom_expires_at,
            ...limits,
          }
        : null,
      features,
    };
  }

  async update(id: string, dto: UpdateClinicDto): Promise<Clinic> {
    await this.findOne(id);
    if (dto.name) dto.name = decodeHtmlEntities(dto.name);

    // Directory listing approval gate:
    // Setting listed_in_directory=true directly is not allowed — it creates a
    // pending approval request instead. Super admin approves, which sets the
    // field to true. Setting it to false clears the approval state.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { ...dto };
    if ('listed_in_directory' in dto) {
      if (dto.listed_in_directory === true) {
        payload.listed_in_directory = false; // stays false until admin approves
        payload.directory_approval_status = 'pending';
        payload.directory_requested_at = new Date();
        payload.directory_rejection_reason = null;
      } else if (dto.listed_in_directory === false) {
        payload.listed_in_directory = false;
        payload.directory_approval_status = 'none';
        payload.directory_requested_at = null;
        payload.directory_approved_at = null;
        payload.directory_rejection_reason = null;
      }
    }

    return this.prisma.clinic.update({ where: { id }, data: payload });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<Clinic> {
    await this.findOne(id);
    const { trial_ends_at, next_billing_at, billing_cycle, ...rest } = dto;

    // When billing_cycle is flipped without an explicit next_billing_at, auto-
    // anchor the next renewal to one full cycle from now so the renewal cron
    // fires on the right date rather than the stale old-cycle anchor.
    let resolvedNextBillingAt = next_billing_at;
    if (billing_cycle !== undefined && next_billing_at === undefined) {
      const anchor = new Date();
      if (billing_cycle === 'yearly') {
        anchor.setFullYear(anchor.getFullYear() + 1);
      } else {
        anchor.setMonth(anchor.getMonth() + 1);
      }
      resolvedNextBillingAt = anchor.toISOString();
    }

    return this.prisma.clinic.update({
      where: { id },
      data: {
        ...rest,
        ...(billing_cycle !== undefined ? { billing_cycle } : {}),
        ...(trial_ends_at !== undefined ? { trial_ends_at: new Date(trial_ends_at) } : {}),
        // Allow explicit null to clear the next-billing anchor (e.g. when
        // moving a clinic back to trial). undefined keeps the existing value.
        ...(resolvedNextBillingAt !== undefined
          ? { next_billing_at: resolvedNextBillingAt === null ? null : new Date(resolvedNextBillingAt) }
          : {}),
      },
      include: { plan: true },
    });
  }

  async getOnboardingStatus(clinicId: string) {
    const [clinic, branch, staffCount, patientCount, appointmentCount] =
      await Promise.all([
        this.prisma.clinic.findUnique({
          where: { id: clinicId },
          select: { logo_url: true, address: true, city: true, state: true, phone: true },
        }),
        this.prisma.branch.findFirst({
          where: { clinic_id: clinicId },
          select: { working_start_time: true, working_end_time: true },
        }),
        this.prisma.user.count({
          where: { clinic_id: clinicId, role: { not: 'SuperAdmin' }, status: 'active' },
        }),
        this.prisma.patient.count({ where: { clinic_id: clinicId } }),
        this.prisma.appointment.count({ where: { clinic_id: clinicId } }),
      ]);

    const items = [
      {
        id: 'clinic_logo',
        title: 'Upload clinic logo',
        description: 'Shows on invoices, prescriptions & patient communications',
        completed: !!clinic?.logo_url,
        href: '/settings',
        category: 'setup',
        weight: 5,
      },
      {
        id: 'clinic_address',
        title: 'Complete clinic address',
        description: 'Required for invoices and public directory listing',
        completed: !!(clinic?.address && clinic?.city && clinic?.state),
        href: '/settings',
        category: 'setup',
        weight: 10,
      },
      {
        id: 'clinic_phone',
        title: 'Add clinic contact number',
        description: 'Printed on prescriptions and invoices for patients',
        completed: !!clinic?.phone,
        href: '/settings',
        category: 'setup',
        weight: 5,
      },
      {
        id: 'branch_hours',
        title: 'Set branch working hours',
        description: 'Define when patients can book and staff can be scheduled',
        completed: !!(branch?.working_start_time && branch?.working_end_time),
        href: '/branches',
        category: 'setup',
        weight: 15,
      },
      {
        id: 'add_staff',
        title: 'Invite your first staff member',
        description: 'Add dentists, receptionists or assistants to your clinic',
        completed: staffCount > 0,
        href: '/staff',
        category: 'team',
        weight: 15,
      },
      {
        id: 'add_patient',
        title: 'Add your first patient',
        description: 'Register a patient to start managing their dental care',
        completed: patientCount > 0,
        href: '/patients/new',
        category: 'patients',
        weight: 20,
      },
      {
        id: 'book_appointment',
        title: 'Book your first appointment',
        description: 'Schedule a patient on the calendar',
        completed: appointmentCount > 0,
        href: '/appointments',
        category: 'patients',
        weight: 25,
      },
    ];

    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    const completedWeight = items
      .filter((i) => i.completed)
      .reduce((sum, i) => sum + i.weight, 0);

    return {
      percentage: Math.round((completedWeight / totalWeight) * 100),
      completed_count: items.filter((i) => i.completed).length,
      total_count: items.length,
      items,
    };
  }
}
