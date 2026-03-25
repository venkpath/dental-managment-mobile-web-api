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
exports.ToothChartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const CONDITION_INCLUDE = {
    tooth: true,
    surface: true,
    dentist: { select: { id: true, name: true, email: true, role: true } },
};
let ToothChartService = class ToothChartService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTeeth() {
        return this.prisma.tooth.findMany({ orderBy: { fdi_number: 'asc' } });
    }
    async getSurfaces() {
        return this.prisma.toothSurface.findMany({ orderBy: { name: 'asc' } });
    }
    async getPatientToothChart(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({
            where: { id: patientId },
        });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
        }
        const [teeth, surfaces, conditions, treatments] = await Promise.all([
            this.prisma.tooth.findMany({ orderBy: { fdi_number: 'asc' } }),
            this.prisma.toothSurface.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.patientToothCondition.findMany({
                where: { clinic_id: clinicId, patient_id: patientId },
                include: CONDITION_INCLUDE,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.treatment.findMany({
                where: {
                    clinic_id: clinicId,
                    patient_id: patientId,
                    tooth_number: { not: null },
                },
                include: { dentist: { select: { id: true, name: true, email: true, role: true } } },
                orderBy: { created_at: 'desc' },
            }),
        ]);
        return { teeth, surfaces, conditions, treatments };
    }
    async createCondition(clinicId, dto) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: dto.branch_id },
        });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        const patient = await this.prisma.patient.findUnique({
            where: { id: dto.patient_id },
        });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        const tooth = await this.prisma.tooth.findUnique({
            where: { id: dto.tooth_id },
        });
        if (!tooth) {
            throw new common_1.NotFoundException(`Tooth with ID "${dto.tooth_id}" not found`);
        }
        if (dto.surface_id) {
            const surface = await this.prisma.toothSurface.findUnique({
                where: { id: dto.surface_id },
            });
            if (!surface) {
                throw new common_1.NotFoundException(`Tooth surface with ID "${dto.surface_id}" not found`);
            }
        }
        const dentist = await this.prisma.user.findUnique({
            where: { id: dto.diagnosed_by },
        });
        if (!dentist || dentist.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Dentist with ID "${dto.diagnosed_by}" not found in this clinic`);
        }
        return this.prisma.patientToothCondition.create({
            data: {
                ...dto,
                clinic_id: clinicId,
            },
            include: CONDITION_INCLUDE,
        });
    }
    async updateCondition(clinicId, id, dto) {
        const condition = await this.prisma.patientToothCondition.findUnique({
            where: { id },
        });
        if (!condition || condition.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Tooth condition with ID "${id}" not found`);
        }
        if (dto.surface_id) {
            const surface = await this.prisma.toothSurface.findUnique({
                where: { id: dto.surface_id },
            });
            if (!surface) {
                throw new common_1.NotFoundException(`Tooth surface with ID "${dto.surface_id}" not found`);
            }
        }
        return this.prisma.patientToothCondition.update({
            where: { id },
            data: { ...dto },
            include: CONDITION_INCLUDE,
        });
    }
};
exports.ToothChartService = ToothChartService;
exports.ToothChartService = ToothChartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ToothChartService);
//# sourceMappingURL=tooth-chart.service.js.map