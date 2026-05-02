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
var TreatmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreatmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const client_1 = require("@prisma/client");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const plan_limit_service_js_1 = require("../../common/services/plan-limit.service.js");
let TreatmentService = class TreatmentService {
    static { TreatmentService_1 = this; }
    prisma;
    planLimit;
    constructor(prisma, planLimit) {
        this.prisma = prisma;
        this.planLimit = planLimit;
    }
    static PROCEDURE_CONDITION_MAP = {
        RCT: 'RCT',
        Extraction: 'Missing',
        Filling: 'Filled',
        Crown: 'Crown',
        Bridge: 'Crown',
        Implant: 'Implant',
    };
    async create(clinicId, dto) {
        await this.planLimit.enforceMonthlyCap(clinicId, 'treatments');
        const [branch, patient, dentist] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
            this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
            this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        if (!dentist || dentist.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
        }
        const treatment = await this.prisma.treatment.create({
            data: {
                ...dto,
                clinic_id: clinicId,
                cost: new client_1.Prisma.Decimal(dto.cost),
            },
            include: { patient: true, dentist: true, branch: true },
        });
        if (dto.tooth_number) {
            const conditionName = TreatmentService_1.PROCEDURE_CONDITION_MAP[dto.procedure];
            if (conditionName) {
                const fdiNumbers = dto.tooth_number
                    .split(',')
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => !isNaN(n));
                for (const fdiNumber of fdiNumbers) {
                    const tooth = await this.prisma.tooth.findUnique({ where: { fdi_number: fdiNumber } });
                    if (tooth) {
                        await this.prisma.patientToothCondition.create({
                            data: {
                                clinic_id: clinicId,
                                branch_id: dto.branch_id,
                                patient_id: dto.patient_id,
                                tooth_id: tooth.id,
                                condition: conditionName,
                                notes: `Auto-recorded from treatment: ${dto.procedure} — ${dto.diagnosis}`,
                                diagnosed_by: dto.dentist_id,
                            },
                        });
                    }
                }
            }
        }
        return treatment;
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.patient_id) {
            where.patient_id = query.patient_id;
        }
        if (query.dentist_id) {
            where.dentist_id = query.dentist_id;
        }
        if (query.branch_id) {
            where.branch_id = query.branch_id;
        }
        if (query.status) {
            where.status = query.status;
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.treatment.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: { patient: true, dentist: true, branch: true },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.treatment.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findByPatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found`);
        }
        return this.prisma.treatment.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            orderBy: { created_at: 'desc' },
            include: { dentist: true, branch: true },
        });
    }
    async findOne(clinicId, id) {
        const treatment = await this.prisma.treatment.findUnique({
            where: { id },
            include: { patient: true, dentist: true, branch: true },
        });
        if (!treatment || treatment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Treatment with ID "${id}" not found`);
        }
        return treatment;
    }
    async update(clinicId, id, dto) {
        await this.findOne(clinicId, id);
        if (dto.dentist_id) {
            const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
            if (!dentist || dentist.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
            }
        }
        const { cost, ...rest } = dto;
        return this.prisma.treatment.update({
            where: { id },
            data: {
                ...rest,
                ...(cost !== undefined ? { cost: new client_1.Prisma.Decimal(cost) } : {}),
            },
            include: { patient: true, dentist: true, branch: true },
        });
    }
};
exports.TreatmentService = TreatmentService;
exports.TreatmentService = TreatmentService = TreatmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        plan_limit_service_js_1.PlanLimitService])
], TreatmentService);
//# sourceMappingURL=treatment.service.js.map