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
exports.PrescriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const PRESCRIPTION_INCLUDE = {
    items: true,
    patient: true,
    dentist: true,
    branch: true,
};
let PrescriptionService = class PrescriptionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(clinicId, dto) {
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
        const { items, ...rest } = dto;
        return this.prisma.$transaction(async (tx) => {
            return tx.prescription.create({
                data: {
                    ...rest,
                    clinic_id: clinicId,
                    items: {
                        create: items,
                    },
                },
                include: PRESCRIPTION_INCLUDE,
            });
        });
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.branch_id) {
            where.branch_id = query.branch_id;
        }
        if (query.search) {
            where.patient = {
                OR: [
                    { first_name: { contains: query.search, mode: 'insensitive' } },
                    { last_name: { contains: query.search, mode: 'insensitive' } },
                ],
            };
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.prescription.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: PRESCRIPTION_INCLUDE,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.prescription.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const prescription = await this.prisma.prescription.findUnique({
            where: { id },
            include: PRESCRIPTION_INCLUDE,
        });
        if (!prescription || prescription.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Prescription with ID "${id}" not found`);
        }
        return prescription;
    }
    async update(clinicId, id, dto) {
        const existing = await this.prisma.prescription.findUnique({ where: { id } });
        if (!existing || existing.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Prescription with ID "${id}" not found`);
        }
        if (dto.dentist_id) {
            const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
            if (!dentist || dentist.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
            }
        }
        const { items, ...rest } = dto;
        return this.prisma.$transaction(async (tx) => {
            if (items) {
                await tx.prescriptionItem.deleteMany({ where: { prescription_id: id } });
            }
            return tx.prescription.update({
                where: { id },
                data: {
                    ...rest,
                    ...(items ? { items: { create: items } } : {}),
                },
                include: PRESCRIPTION_INCLUDE,
            });
        });
    }
    async findByPatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found`);
        }
        return this.prisma.prescription.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            orderBy: { created_at: 'desc' },
            include: PRESCRIPTION_INCLUDE,
        });
    }
};
exports.PrescriptionService = PrescriptionService;
exports.PrescriptionService = PrescriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PrescriptionService);
//# sourceMappingURL=prescription.service.js.map