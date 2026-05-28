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
exports.InsuranceReimbursementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
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
let InsuranceReimbursementService = class InsuranceReimbursementService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(clinicId, filters = {}) {
        const { from, to, skip = 0, take = 50 } = filters;
        const where = { clinic_id: clinicId };
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
    async findOne(id, clinicId) {
        const r = await this.prisma.insuranceReimbursement.findFirst({
            where: { id, clinic_id: clinicId },
            include: REIMBURSEMENT_INCLUDE,
        });
        if (!r)
            throw new common_1.NotFoundException('Reimbursement not found');
        return r;
    }
    async create(clinicId, dto, userId) {
        if (dto.allocations.length > 0) {
            const claimIds = dto.allocations.map((a) => a.claim_id);
            const claims = await this.prisma.insuranceClaim.findMany({
                where: { id: { in: claimIds }, clinic_id: clinicId },
                select: { id: true, status: true },
            });
            if (claims.length !== claimIds.length) {
                throw new common_1.BadRequestException('One or more claim IDs are invalid or do not belong to this clinic');
            }
            const nonApproved = claims.filter((c) => !['APPROVED', 'PARTIALLY_APPROVED', 'PAID'].includes(c.status));
            if (nonApproved.length > 0) {
                throw new common_1.BadRequestException('Can only allocate reimbursement to APPROVED or PARTIALLY_APPROVED claims');
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
};
exports.InsuranceReimbursementService = InsuranceReimbursementService;
exports.InsuranceReimbursementService = InsuranceReimbursementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], InsuranceReimbursementService);
//# sourceMappingURL=insurance-reimbursement.service.js.map