import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { CreateReimbursementDto } from '../dto/create-claim.dto.js';

const REIMBURSEMENT_INCLUDE = {
  allocations: {
    include: {
      claim: {
        include: {
          patient_insurance: {
            include: {
              plan: {
                include: {
                  provider: { select: { id: true, name: true, short_code: true } },
                },
              },
              patient: { select: { id: true, first_name: true, last_name: true } },
            },
          },
          invoice: { select: { id: true, invoice_number: true } },
        },
      },
    },
  },
  recorded_by: { select: { id: true, first_name: true, last_name: true } },
};

@Injectable()
export class InsuranceReimbursementService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ────────────────────────────────────────────────────────────────

  async findAll(clinicId: string, filters: { from?: string; to?: string; skip?: number; take?: number } = {}) {
    const { from, to, skip = 0, take = 50 } = filters;

    const where: Record<string, unknown> = { clinic_id: clinicId };
    if (from || to) {
      where['received_at'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.insuranceReimbursement.count({ where }),
      this.prisma.insuranceReimbursement.findMany({
        where,
        skip,
        take,
        orderBy: { received_at: 'desc' },
        include: REIMBURSEMENT_INCLUDE,
      }),
    ]);

    return { total, items };
  }

  // ─── Get one ─────────────────────────────────────────────────────────────

  async findOne(id: string, clinicId: string) {
    const r = await this.prisma.insuranceReimbursement.findFirst({
      where: { id, clinic_id: clinicId },
      include: REIMBURSEMENT_INCLUDE,
    });
    if (!r) throw new NotFoundException('Reimbursement not found');
    return r;
  }

  // ─── Record ───────────────────────────────────────────────────────────────

  async create(clinicId: string, dto: CreateReimbursementDto, userId: string) {
    // Validate all claim IDs belong to this clinic
    if (dto.allocations.length > 0) {
      const claimIds = dto.allocations.map((a) => a.claim_id);
      const claims = await this.prisma.insuranceClaim.findMany({
        where: { id: { in: claimIds }, clinic_id: clinicId },
        select: { id: true, status: true },
      });

      if (claims.length !== claimIds.length) {
        throw new BadRequestException('One or more claim IDs are invalid or do not belong to this clinic');
      }

      const nonApproved = claims.filter((c) => !['APPROVED', 'PARTIALLY_APPROVED', 'PAID'].includes(c.status));
      if (nonApproved.length > 0) {
        throw new BadRequestException('Can only allocate reimbursement to APPROVED or PARTIALLY_APPROVED claims');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const reimbursement = await tx.insuranceReimbursement.create({
        data: {
          clinic_id: clinicId,
          received_at: new Date(dto.received_at),
          amount_received: dto.amount_received,
          tds_deducted: dto.tds_deducted ?? 0,
          bank_utr_ref: dto.bank_utr_ref ?? null,
          currency: dto.currency ?? 'INR',
          notes: dto.notes ?? null,
          recorded_by_user_id: userId,
        },
      });

      for (const alloc of dto.allocations) {
        await tx.insuranceReimbursementAllocation.create({
          data: {
            reimbursement_id: reimbursement.id,
            claim_id: alloc.claim_id,
            allocated_amount: alloc.allocated_amount,
            disallowed_amount: alloc.disallowed_amount ?? 0,
            disallowance_reason: alloc.disallowance_reason ?? null,
            action_taken: alloc.action_taken ?? 'NONE',
          },
        });

        // Update claim paid_amount and status if fully allocated
        const claim = await tx.insuranceClaim.findUnique({
          where: { id: alloc.claim_id },
          select: { paid_amount: true, approved_amount: true, status: true },
        });

        if (claim && claim.status !== 'PAID') {
          const newPaid = Number(claim.paid_amount ?? 0) + alloc.allocated_amount;
          await tx.insuranceClaim.update({
            where: { id: alloc.claim_id },
            data: {
              paid_amount: newPaid,
              paid_at: new Date(),
              status: 'PAID',
            },
          });

          await tx.insuranceClaimStatusHistory.create({
            data: {
              claim_id: alloc.claim_id,
              from_status: claim.status,
              to_status: 'PAID',
              changed_by_user_id: userId,
              note: `Reimbursement recorded — UTR: ${dto.bank_utr_ref ?? 'N/A'}`,
            },
          });
        }
      }

      return tx.insuranceReimbursement.findUnique({
        where: { id: reimbursement.id },
        include: REIMBURSEMENT_INCLUDE,
      });
    });
  }
}
