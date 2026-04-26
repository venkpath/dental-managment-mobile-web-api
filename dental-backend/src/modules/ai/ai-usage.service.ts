import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { computeCostInr } from './ai-pricing.js';

const DEFAULT_CYCLE_DAYS = 30;

export interface QuotaSnapshot {
  base_quota: number;
  overage_cap: number;
  overage_enabled: boolean;
  approved_extra: number;
  used_in_cycle: number;
  effective_quota: number;
  cycle_start: Date;
  cycle_end: Date;
  is_blocked_unpaid: boolean;
  pending_charge_id: string | null;
  plan_name: string | null;
}

/**
 * AiUsageService
 *
 * Owns AI quota / overage / billing state for a clinic:
 *   - lazy-creates ClinicAiSettings with cycle window aligned to subscription
 *   - enforces base + overage + approved_extra effective quota
 *   - blocks requests when prior overage charges are unpaid
 *   - records per-request token usage and computed cost
 *   - closes cycles into AiOverageCharge rows
 *   - settles charges on payment (Razorpay webhook or manual super-admin mark)
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Settings + cycle window ───────────────────────────────────

  async ensureSettings(clinicId: string) {
    const existing = await this.prisma.clinicAiSettings.findUnique({
      where: { clinic_id: clinicId },
    });
    if (existing) return existing;

    const { start, end } = this.deriveInitialCycle();
    return this.prisma.clinicAiSettings.create({
      data: {
        clinic_id: clinicId,
        current_cycle_start: start,
        current_cycle_end: end,
      },
    });
  }

  private deriveInitialCycle(now: Date = new Date()) {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + DEFAULT_CYCLE_DAYS);
    return { start, end };
  }

  // ─── Pre-flight quota check (used by guard) ───────────────────

  async snapshot(clinicId: string): Promise<QuotaSnapshot> {
    const [clinic, settings, blockingCharge] = await Promise.all([
      this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          plan: { select: { name: true, ai_quota: true, ai_overage_cap: true } },
        },
      }),
      this.ensureSettings(clinicId),
      this.prisma.aiOverageCharge.findFirst({
        where: { clinic_id: clinicId, status: { in: ['pending', 'invoiced'] } },
        orderBy: { cycle_start: 'asc' },
        select: { id: true },
      }),
    ]);

    const baseQuota = clinic?.plan?.ai_quota ?? 0;
    const overageCap = clinic?.plan?.ai_overage_cap ?? 0;
    const overageHeadroom = settings.overage_enabled
      ? Math.max(0, overageCap - baseQuota)
      : 0;
    const effective = baseQuota + overageHeadroom + settings.approved_extra;

    return {
      base_quota: baseQuota,
      overage_cap: overageCap,
      overage_enabled: settings.overage_enabled,
      approved_extra: settings.approved_extra,
      used_in_cycle: settings.used_in_cycle,
      effective_quota: effective,
      cycle_start: settings.current_cycle_start,
      cycle_end: settings.current_cycle_end,
      is_blocked_unpaid: !!blockingCharge,
      pending_charge_id: blockingCharge?.id ?? null,
      plan_name: clinic?.plan?.name ?? null,
    };
  }

  /**
   * Throws if the clinic cannot make another AI request.
   * Atomically reserves a slot by incrementing `used_in_cycle`.
   * Caller MUST call `recordUsage` (or `releaseReservation`) afterwards.
   */
  async reserveSlot(clinicId: string): Promise<QuotaSnapshot> {
    const snap = await this.snapshot(clinicId);

    if (snap.is_blocked_unpaid) {
      throw new ForbiddenException(
        'AI features are paused until your previous billing cycle overage charge is settled. Please complete payment to resume.',
      );
    }

    if (snap.effective_quota <= 0) {
      throw new ForbiddenException(
        'AI features require an active subscription plan with AI quota.',
      );
    }

    // Atomic reservation: only increments if used < effective
    const updated = await this.prisma.clinicAiSettings.updateMany({
      where: {
        clinic_id: clinicId,
        used_in_cycle: { lt: snap.effective_quota },
      },
      data: { used_in_cycle: { increment: 1 } },
    });

    if (updated.count === 0) {
      // At cap → check whether overage can be enabled or super-admin approval needed
      if (!snap.overage_enabled && snap.overage_cap > snap.base_quota) {
        throw new ForbiddenException(
          `Base AI quota of ${snap.base_quota} reached. Enable overage in settings to continue (billed at OpenAI cost).`,
        );
      }
      if (snap.overage_enabled && snap.overage_cap > 0 && snap.used_in_cycle >= snap.overage_cap + snap.approved_extra) {
        throw new ForbiddenException(
          `Plan AI cap of ${snap.overage_cap} reached for this cycle. Request additional approval from super-admin.`,
        );
      }
      throw new ForbiddenException(
        `AI quota exhausted for this cycle (${snap.used_in_cycle}/${snap.effective_quota}).`,
      );
    }

    return { ...snap, used_in_cycle: snap.used_in_cycle + 1 };
  }

  async releaseReservation(clinicId: string): Promise<void> {
    await this.prisma.clinicAiSettings.updateMany({
      where: { clinic_id: clinicId, used_in_cycle: { gt: 0 } },
      data: { used_in_cycle: { decrement: 1 } },
    });
  }

  /**
   * Record an actual AI call (model + token usage). Computes pass-through INR
   * cost and flags the row as overage if it exceeded base quota.
   * The reservation should already have been made via `reserveSlot`.
   */
  async recordUsage(params: {
    clinicId: string;
    userId?: string;
    type: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
  }): Promise<void> {
    const total = params.promptTokens + params.completionTokens;
    const costInr = computeCostInr(params.model, params.promptTokens, params.completionTokens);

    const settings = await this.prisma.clinicAiSettings.findUnique({
      where: { clinic_id: params.clinicId },
    });
    if (!settings) {
      this.logger.warn(`No ClinicAiSettings for ${params.clinicId} — skipping usage record`);
      return;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: params.clinicId },
      select: { plan: { select: { ai_quota: true } } },
    });
    const baseQuota = clinic?.plan?.ai_quota ?? 0;
    const isOverage = settings.used_in_cycle > baseQuota;

    await this.prisma.aiUsageRecord.create({
      data: {
        clinic_id: params.clinicId,
        user_id: params.userId,
        type: params.type,
        model: params.model,
        prompt_tokens: params.promptTokens,
        completion_tokens: params.completionTokens,
        total_tokens: total,
        cost_inr: costInr,
        is_overage: isOverage,
        cycle_start: settings.current_cycle_start,
        cycle_end: settings.current_cycle_end,
      },
    });
  }

  // ─── Clinic-admin actions ──────────────────────────────────────

  async setOverageEnabled(clinicId: string, enabled: boolean) {
    await this.ensureSettings(clinicId);
    return this.prisma.clinicAiSettings.update({
      where: { clinic_id: clinicId },
      data: { overage_enabled: enabled },
    });
  }

  async createApprovalRequest(params: {
    clinicId: string;
    userId?: string;
    requestedAmount: number;
    reason: string;
  }) {
    if (params.requestedAmount <= 0) {
      throw new BadRequestException('requested_amount must be positive');
    }
    const settings = await this.ensureSettings(params.clinicId);

    const existingPending = await this.prisma.aiQuotaApprovalRequest.findFirst({
      where: {
        clinic_id: params.clinicId,
        cycle_start: settings.current_cycle_start,
        status: 'pending',
      },
    });
    if (existingPending) {
      throw new BadRequestException(
        'A pending approval request already exists for the current cycle.',
      );
    }

    return this.prisma.aiQuotaApprovalRequest.create({
      data: {
        clinic_id: params.clinicId,
        requested_by: params.userId,
        requested_amount: params.requestedAmount,
        reason: params.reason,
        cycle_start: settings.current_cycle_start,
      },
    });
  }

  async listMyApprovalRequests(clinicId: string) {
    return this.prisma.aiQuotaApprovalRequest.findMany({
      where: { clinic_id: clinicId },
      orderBy: { created_at: 'desc' },
      take: 25,
    });
  }

  // ─── Super-admin actions ──────────────────────────────────────

  async listApprovalRequests(filters: { status?: string; clinicId?: string } = {}) {
    return this.prisma.aiQuotaApprovalRequest.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.clinicId ? { clinic_id: filters.clinicId } : {}),
      },
      include: { clinic: { select: { id: true, name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async decideApprovalRequest(params: {
    requestId: string;
    superAdminId: string;
    status: 'approved' | 'rejected';
    approvedAmount?: number;
    note?: string;
  }) {
    const request = await this.prisma.aiQuotaApprovalRequest.findUnique({
      where: { id: params.requestId },
    });
    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== 'pending') {
      throw new BadRequestException('Request has already been decided');
    }

    if (params.status === 'approved') {
      const amount = params.approvedAmount ?? request.requested_amount;
      if (amount <= 0) {
        throw new BadRequestException('approved_amount must be positive');
      }

      await this.prisma.$transaction([
        this.prisma.aiQuotaApprovalRequest.update({
          where: { id: params.requestId },
          data: {
            status: 'approved',
            approved_amount: amount,
            approved_by: params.superAdminId,
            decision_note: params.note,
            decided_at: new Date(),
          },
        }),
        this.prisma.clinicAiSettings.update({
          where: { clinic_id: request.clinic_id },
          data: {
            approved_extra: { increment: amount },
            approved_extra_reason: params.note ?? request.reason,
          },
        }),
      ]);
    } else {
      await this.prisma.aiQuotaApprovalRequest.update({
        where: { id: params.requestId },
        data: {
          status: 'rejected',
          approved_by: params.superAdminId,
          decision_note: params.note,
          decided_at: new Date(),
        },
      });
    }

    return this.prisma.aiQuotaApprovalRequest.findUnique({ where: { id: params.requestId } });
  }

  async listOverageCharges(filters: { status?: string; clinicId?: string } = {}) {
    return this.prisma.aiOverageCharge.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.clinicId ? { clinic_id: filters.clinicId } : {}),
      },
      include: { clinic: { select: { id: true, name: true, email: true } } },
      orderBy: { cycle_start: 'desc' },
      take: 100,
    });
  }

  async markChargePaid(params: {
    chargeId: string;
    superAdminId: string;
    paymentReference: string;
    note?: string;
  }) {
    const charge = await this.prisma.aiOverageCharge.findUnique({ where: { id: params.chargeId } });
    if (!charge) throw new NotFoundException('Overage charge not found');
    if (charge.status === 'paid' || charge.status === 'waived') {
      throw new BadRequestException(`Charge already ${charge.status}`);
    }
    return this.prisma.aiOverageCharge.update({
      where: { id: params.chargeId },
      data: {
        status: 'paid',
        paid_at: new Date(),
        paid_by_super_admin_id: params.superAdminId,
        payment_reference: params.paymentReference,
        notes: params.note,
      },
    });
  }

  async waiveCharge(params: { chargeId: string; superAdminId: string; note?: string }) {
    const charge = await this.prisma.aiOverageCharge.findUnique({ where: { id: params.chargeId } });
    if (!charge) throw new NotFoundException('Overage charge not found');
    if (charge.status === 'paid' || charge.status === 'waived') {
      throw new BadRequestException(`Charge already ${charge.status}`);
    }
    return this.prisma.aiOverageCharge.update({
      where: { id: params.chargeId },
      data: {
        status: 'waived',
        paid_at: new Date(),
        paid_by_super_admin_id: params.superAdminId,
        notes: params.note,
      },
    });
  }

  /**
   * Settle the oldest pending/invoiced overage charge for a clinic.
   * Called from Razorpay webhook on subscription.charged.
   */
  async settleOldestPendingFromPayment(clinicId: string, paymentReference: string): Promise<void> {
    const charge = await this.prisma.aiOverageCharge.findFirst({
      where: { clinic_id: clinicId, status: { in: ['pending', 'invoiced'] } },
      orderBy: { cycle_start: 'asc' },
    });
    if (!charge) return;

    await this.prisma.aiOverageCharge.update({
      where: { id: charge.id },
      data: {
        status: 'paid',
        paid_at: new Date(),
        payment_reference: paymentReference,
        notes: 'Auto-settled via Razorpay subscription charge',
      },
    });
    this.logger.log(`Settled overage charge ${charge.id} for clinic ${clinicId} via ${paymentReference}`);
  }

  // ─── Cycle close (cron) ───────────────────────────────────────

  /**
   * Close any AI cycles that have ended. For each clinic with a passed cycle:
   *   1. Aggregate this cycle's overage usage into AiOverageCharge (idempotent)
   *   2. Roll the cycle window forward
   *   3. Reset used_in_cycle and approved_extra
   */
  async closeEndedCycles(now: Date = new Date()): Promise<number> {
    const dueClinics = await this.prisma.clinicAiSettings.findMany({
      where: { current_cycle_end: { lte: now } },
      select: { clinic_id: true },
    });
    let closed = 0;
    for (const { clinic_id } of dueClinics) {
      try {
        await this.closeCycleForClinic(clinic_id);
        closed++;
      } catch (err) {
        this.logger.error(
          `Failed to close cycle for clinic ${clinic_id}: ${(err as Error).message}`,
        );
      }
    }
    return closed;
  }

  async closeCycleForClinic(clinicId: string): Promise<void> {
    const settings = await this.prisma.clinicAiSettings.findUnique({
      where: { clinic_id: clinicId },
    });
    if (!settings) return;

    // Aggregate overage records for the closing cycle
    const overageAgg = await this.prisma.aiUsageRecord.aggregate({
      where: {
        clinic_id: clinicId,
        cycle_start: settings.current_cycle_start,
        is_overage: true,
      },
      _count: true,
      _sum: { cost_inr: true },
    });

    const overageCount = overageAgg._count ?? 0;
    const totalCost = Number(overageAgg._sum?.cost_inr ?? 0);

    if (overageCount > 0) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { plan: { select: { ai_quota: true } } },
      });
      const baseQuota = clinic?.plan?.ai_quota ?? 0;

      // Idempotent on (clinic_id, cycle_start)
      await this.prisma.aiOverageCharge.upsert({
        where: {
          clinic_id_cycle_start: {
            clinic_id: clinicId,
            cycle_start: settings.current_cycle_start,
          },
        },
        create: {
          clinic_id: clinicId,
          cycle_start: settings.current_cycle_start,
          cycle_end: settings.current_cycle_end,
          base_quota: baseQuota,
          overage_requests_count: overageCount,
          approved_requests_count: settings.approved_extra,
          total_cost_inr: totalCost,
          status: 'pending',
        },
        update: {
          overage_requests_count: overageCount,
          approved_requests_count: settings.approved_extra,
          total_cost_inr: totalCost,
        },
      });
    }

    // Roll cycle window forward and reset counters
    const nextStart = new Date(settings.current_cycle_end);
    const nextEnd = new Date(nextStart);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + DEFAULT_CYCLE_DAYS);

    await this.prisma.clinicAiSettings.update({
      where: { clinic_id: clinicId },
      data: {
        current_cycle_start: nextStart,
        current_cycle_end: nextEnd,
        used_in_cycle: 0,
        approved_extra: 0,
        approved_extra_reason: null,
      },
    });
  }

  /**
   * Realign a clinic's cycle window to its Razorpay subscription period.
   * Called from PaymentService.getSubscriptionStatus when Razorpay reports a new period.
   */
  async syncCycleWithSubscription(
    clinicId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    await this.ensureSettings(clinicId);
    const current = await this.prisma.clinicAiSettings.findUnique({
      where: { clinic_id: clinicId },
    });
    if (!current) return;
    if (
      current.current_cycle_start.getTime() === periodStart.getTime() &&
      current.current_cycle_end.getTime() === periodEnd.getTime()
    ) {
      return;
    }
    await this.prisma.clinicAiSettings.update({
      where: { clinic_id: clinicId },
      data: {
        current_cycle_start: periodStart,
        current_cycle_end: periodEnd,
      },
    });
  }
}
