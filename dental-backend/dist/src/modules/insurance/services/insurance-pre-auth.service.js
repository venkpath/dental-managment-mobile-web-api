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
exports.InsurancePreAuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
const insurance_file_service_js_1 = require("./insurance-file.service.js");
const PRE_AUTH_INCLUDE = {
    patient_insurance: {
        include: {
            plan: {
                include: {
                    provider: { select: { id: true, name: true, short_code: true, type: true, country: true } },
                },
            },
            patient: { select: { id: true, first_name: true, last_name: true, phone: true } },
        },
    },
    claims: {
        select: { id: true, status: true, claim_number: true, billed_amount: true, created_at: true },
    },
};
const ALLOWED_TRANSITIONS = {
    REQUESTED: ['SUBMITTED'],
    SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['EXPIRED'],
    REJECTED: ['SUBMITTED'],
    EXPIRED: [],
};
let InsurancePreAuthService = class InsurancePreAuthService {
    prisma;
    files;
    constructor(prisma, files) {
        this.prisma = prisma;
        this.files = files;
    }
    async findAll(clinicId, filters = {}) {
        const { status, patient_id, skip = 0, take = 50 } = filters;
        const where = { clinic_id: clinicId };
        if (status)
            where['status'] = status;
        if (patient_id)
            where['patient_insurance'] = { patient_id };
        const [total, items] = await this.prisma.$transaction([
            this.prisma.insurancePreAuth.count({ where }),
            this.prisma.insurancePreAuth.findMany({
                where,
                skip,
                take,
                orderBy: { created_at: 'desc' },
                include: PRE_AUTH_INCLUDE,
            }),
        ]);
        return { total, items };
    }
    async findOne(id, clinicId) {
        const pa = await this.prisma.insurancePreAuth.findFirst({
            where: { id, clinic_id: clinicId },
            include: PRE_AUTH_INCLUDE,
        });
        if (!pa)
            throw new common_1.NotFoundException('Pre-authorisation not found');
        return pa;
    }
    async create(clinicId, dto) {
        const enrollment = await this.prisma.patientInsurance.findFirst({
            where: { id: dto.patient_insurance_id, clinic_id: clinicId },
            select: { id: true, plan: { select: { requires_preauth: true } } },
        });
        if (!enrollment)
            throw new common_1.NotFoundException('Patient insurance enrollment not found');
        return this.prisma.insurancePreAuth.create({
            data: {
                clinic_id: clinicId,
                patient_insurance_id: dto.patient_insurance_id,
                treatment_plan_id: dto.treatment_plan_id ?? null,
                notes: dto.notes ?? null,
                status: 'REQUESTED',
            },
            include: PRE_AUTH_INCLUDE,
        });
    }
    async submit(id, clinicId, dto, userId) {
        const pa = await this.prisma.insurancePreAuth.findFirst({ where: { id, clinic_id: clinicId } });
        if (!pa)
            throw new common_1.NotFoundException('Pre-authorisation not found');
        if (pa.status !== 'REQUESTED')
            throw new common_1.BadRequestException('Only REQUESTED pre-auths can be submitted');
        return this.prisma.insurancePreAuth.update({
            where: { id },
            data: {
                status: 'SUBMITTED',
                submission_method: dto.submission_method,
                submission_ref: dto.submission_ref ?? null,
                submitted_at: new Date(),
                submitted_by_user_id: userId,
                notes: dto.notes ?? pa.notes,
            },
            include: PRE_AUTH_INCLUDE,
        });
    }
    async updateStatus(id, clinicId, dto) {
        const pa = await this.prisma.insurancePreAuth.findFirst({ where: { id, clinic_id: clinicId } });
        if (!pa)
            throw new common_1.NotFoundException('Pre-authorisation not found');
        const allowed = ALLOWED_TRANSITIONS[pa.status] ?? [];
        if (!allowed.includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${pa.status} to ${dto.status}`);
        }
        const data = { status: dto.status };
        if (dto.approval_code !== undefined)
            data['approval_code'] = dto.approval_code;
        if (dto.approved_amount_cap !== undefined)
            data['approved_amount_cap'] = dto.approved_amount_cap;
        if (dto.valid_from !== undefined)
            data['valid_from'] = new Date(dto.valid_from);
        if (dto.valid_to !== undefined)
            data['valid_to'] = new Date(dto.valid_to);
        if (dto.notes !== undefined)
            data['notes'] = dto.notes;
        if (['APPROVED', 'REJECTED'].includes(dto.status))
            data['decision_at'] = new Date();
        return this.prisma.insurancePreAuth.update({
            where: { id },
            data,
            include: PRE_AUTH_INCLUDE,
        });
    }
    async uploadDocument(id, clinicId, slot, file) {
        const pa = await this.prisma.insurancePreAuth.findFirst({
            where: { id, clinic_id: clinicId },
            select: { id: true, request_pdf_url: true, approval_letter_url: true, rejection_letter_url: true },
        });
        if (!pa)
            throw new common_1.NotFoundException('Pre-authorisation not found');
        const saved = await this.files.save({ clinicId, subdir: 'preauth', file });
        const fieldMap = {
            request: 'request_pdf_url',
            approval: 'approval_letter_url',
            rejection: 'rejection_letter_url',
        };
        const oldPath = pa[fieldMap[slot]];
        await this.files.remove(oldPath);
        return this.prisma.insurancePreAuth.update({
            where: { id },
            data: { [fieldMap[slot]]: saved.file_url },
            include: PRE_AUTH_INCLUDE,
        });
    }
    async getDownloadToken(id, clinicId, slot) {
        const pa = await this.prisma.insurancePreAuth.findFirst({
            where: { id, clinic_id: clinicId },
            select: { request_pdf_url: true, approval_letter_url: true, rejection_letter_url: true },
        });
        if (!pa)
            throw new common_1.NotFoundException('Pre-authorisation not found');
        const fieldMap = {
            request: pa.request_pdf_url,
            approval: pa.approval_letter_url,
            rejection: pa.rejection_letter_url,
        };
        const filePath = fieldMap[slot];
        if (!filePath)
            throw new common_1.NotFoundException(`No ${slot} document uploaded yet`);
        const { token } = this.files.buildDownloadUrl({ clinicId, filePath });
        return { token, file_url: filePath };
    }
    serveFile(clinicId, filePath, token) {
        return this.files.resolveForServing({ clinicId, filePath, token });
    }
};
exports.InsurancePreAuthService = InsurancePreAuthService;
exports.InsurancePreAuthService = InsurancePreAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        insurance_file_service_js_1.InsuranceFileService])
], InsurancePreAuthService);
//# sourceMappingURL=insurance-pre-auth.service.js.map