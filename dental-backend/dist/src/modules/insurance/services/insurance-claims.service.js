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
exports.InsuranceClaimsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
const CLAIM_INCLUDE = {
    patient_insurance: {
        include: {
            plan: {
                include: {
                    provider: { select: { id: true, name: true, short_code: true, type: true, country: true, claim_method: true } },
                },
            },
            patient: { select: { id: true, first_name: true, last_name: true, phone: true } },
        },
    },
    invoice: { select: { id: true, invoice_number: true, total_amount: true, status: true } },
    status_history: {
        orderBy: { changed_at: 'asc' },
    },
    attachments: { orderBy: { uploaded_at: 'desc' } },
    pre_auth: {
        select: {
            id: true,
            status: true,
            approval_code: true,
            approved_amount_cap: true,
            valid_from: true,
            valid_to: true,
            submission_method: true,
            submitted_at: true,
        },
    },
};
const ALLOWED_TRANSITIONS = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['UNDER_REVIEW', 'QUERY_RAISED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED'],
    UNDER_REVIEW: ['QUERY_RAISED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED'],
    QUERY_RAISED: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['PAID', 'CANCELLED'],
    PARTIALLY_APPROVED: ['PAID', 'CANCELLED'],
    REJECTED: ['SUBMITTED', 'CANCELLED'],
    PAID: [],
    CANCELLED: [],
};
let InsuranceClaimsService = class InsuranceClaimsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(clinicId, filters = {}) {
        const { status, patient_id, provider_id, from, to, skip = 0, take = 50 } = filters;
        const where = { clinic_id: clinicId };
        if (status)
            where['status'] = status;
        if (patient_id) {
            where['patient_insurance'] = { patient_id };
        }
        if (provider_id) {
            where['patient_insurance'] = {
                ...(where['patient_insurance'] ?? {}),
                plan: { provider_id },
            };
        }
        if (from || to) {
            where['created_at'] = {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
            };
        }
        const [total, items] = await this.prisma.$transaction([
            this.prisma.insuranceClaim.count({ where }),
            this.prisma.insuranceClaim.findMany({
                where,
                skip,
                take,
                orderBy: { created_at: 'desc' },
                include: {
                    patient_insurance: {
                        include: {
                            plan: {
                                include: {
                                    provider: { select: { id: true, name: true, short_code: true, country: true } },
                                },
                            },
                            patient: { select: { id: true, first_name: true, last_name: true, phone: true } },
                        },
                    },
                    invoice: { select: { id: true, invoice_number: true, total_amount: true } },
                },
            }),
        ]);
        return { total, items };
    }
    async getStats(clinicId) {
        const rows = await this.prisma.insuranceClaim.groupBy({
            by: ['status'],
            where: { clinic_id: clinicId },
            _count: { id: true },
            _sum: { billed_amount: true, paid_amount: true },
        });
        const stats = {};
        for (const r of rows) {
            stats[r.status] = {
                count: r._count.id,
                billed: Number(r._sum.billed_amount ?? 0),
                paid: Number(r._sum.paid_amount ?? 0),
            };
        }
        return stats;
    }
    async getMonthlyReceived(clinicId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const result = await this.prisma.insuranceClaim.aggregate({
            where: { clinic_id: clinicId, status: 'PAID', paid_at: { gte: startOfMonth } },
            _sum: { paid_amount: true },
        });
        return { amount: Number(result._sum.paid_amount ?? 0), month: now.toISOString().slice(0, 7) };
    }
    async findOne(id, clinicId) {
        const claim = await this.prisma.insuranceClaim.findFirst({
            where: { id, clinic_id: clinicId },
            include: CLAIM_INCLUDE,
        });
        if (!claim)
            throw new common_1.NotFoundException('Claim not found');
        return claim;
    }
    async findByInvoice(invoiceId, clinicId) {
        return this.prisma.insuranceClaim.findFirst({
            where: { invoice_id: invoiceId, clinic_id: clinicId },
            include: CLAIM_INCLUDE,
        });
    }
    async submit(id, clinicId, dto, userId) {
        const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, clinic_id: clinicId } });
        if (!claim)
            throw new common_1.NotFoundException('Claim not found');
        if (claim.status !== 'DRAFT')
            throw new common_1.BadRequestException('Only DRAFT claims can be submitted');
        const [updated] = await this.prisma.$transaction([
            this.prisma.insuranceClaim.update({
                where: { id },
                data: {
                    status: 'SUBMITTED',
                    submission_method: dto.submission_method,
                    submission_ref: dto.submission_ref ?? null,
                    claim_number: dto.claim_number ?? null,
                    submitted_at: new Date(),
                    submitted_by_user_id: userId,
                    notes: dto.notes ?? claim.notes,
                },
                include: CLAIM_INCLUDE,
            }),
            this.prisma.insuranceClaimStatusHistory.create({
                data: {
                    claim_id: id,
                    from_status: 'DRAFT',
                    to_status: 'SUBMITTED',
                    changed_by_user_id: userId,
                    note: dto.notes ?? null,
                },
            }),
        ]);
        return updated;
    }
    async updateStatus(id, clinicId, dto, userId) {
        const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, clinic_id: clinicId } });
        if (!claim)
            throw new common_1.NotFoundException('Claim not found');
        const allowed = ALLOWED_TRANSITIONS[claim.status] ?? [];
        if (!allowed.includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${claim.status} to ${dto.status}`);
        }
        const data = { status: dto.status };
        if (dto.claim_number !== undefined)
            data['claim_number'] = dto.claim_number;
        if (dto.approved_amount !== undefined)
            data['approved_amount'] = dto.approved_amount;
        if (dto.patient_portion !== undefined)
            data['patient_portion'] = dto.patient_portion;
        if (dto.disallowed_amount !== undefined)
            data['disallowed_amount'] = dto.disallowed_amount;
        if (dto.rejection_reason !== undefined)
            data['rejection_reason'] = dto.rejection_reason;
        if (dto.query_text !== undefined)
            data['query_text'] = dto.query_text;
        if (dto.notes !== undefined)
            data['notes'] = dto.notes;
        if (['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(dto.status)) {
            data['decision_at'] = new Date();
        }
        if (dto.status === 'QUERY_RAISED') {
            data['query_response_at'] = null;
        }
        const [updated] = await this.prisma.$transaction([
            this.prisma.insuranceClaim.update({
                where: { id },
                data,
                include: CLAIM_INCLUDE,
            }),
            this.prisma.insuranceClaimStatusHistory.create({
                data: {
                    claim_id: id,
                    from_status: claim.status,
                    to_status: dto.status,
                    changed_by_user_id: userId,
                    note: dto.notes ?? null,
                },
            }),
        ]);
        return updated;
    }
    async recordPayment(id, clinicId, dto, userId) {
        const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, clinic_id: clinicId } });
        if (!claim)
            throw new common_1.NotFoundException('Claim not found');
        if (!['APPROVED', 'PARTIALLY_APPROVED'].includes(claim.status)) {
            throw new common_1.BadRequestException('Payment can only be recorded on APPROVED or PARTIALLY_APPROVED claims');
        }
        const [updated] = await this.prisma.$transaction([
            this.prisma.insuranceClaim.update({
                where: { id },
                data: {
                    status: 'PAID',
                    paid_amount: dto.paid_amount,
                    paid_at: dto.paid_at ? new Date(dto.paid_at) : new Date(),
                    notes: dto.notes ?? claim.notes,
                },
                include: CLAIM_INCLUDE,
            }),
            this.prisma.insuranceClaimStatusHistory.create({
                data: {
                    claim_id: id,
                    from_status: claim.status,
                    to_status: 'PAID',
                    changed_by_user_id: userId,
                    note: dto.notes ?? `Payment of ${dto.paid_amount} recorded`,
                },
            }),
        ]);
        return updated;
    }
    async assertOwnership(id, clinicId) {
        const claim = await this.prisma.insuranceClaim.findFirst({
            where: { id, clinic_id: clinicId },
            select: { id: true },
        });
        if (!claim)
            throw new common_1.ForbiddenException('Claim not found or access denied');
    }
};
exports.InsuranceClaimsService = InsuranceClaimsService;
exports.InsuranceClaimsService = InsuranceClaimsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], InsuranceClaimsService);
//# sourceMappingURL=insurance-claims.service.js.map