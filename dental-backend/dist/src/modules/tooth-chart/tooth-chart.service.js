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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToothChartService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const dental_chart_svg_util_js_1 = require("./dental-chart-svg.util.js");
const dental_chart_pdf_util_js_1 = require("./dental-chart-pdf.util.js");
const CONDITION_INCLUDE = {
    tooth: true,
    surface: true,
    dentist: { select: { id: true, name: true, email: true, role: true } },
};
let ToothChartService = class ToothChartService {
    prisma;
    s3Service;
    constructor(prisma, s3Service) {
        this.prisma = prisma;
        this.s3Service = s3Service;
    }
    async getChartPdfUrl(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { name: true },
        });
        const conditions = await this.prisma.patientToothCondition.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            include: { tooth: true, surface: true },
            orderBy: { created_at: 'desc' },
        });
        const chartConditions = conditions.map((c) => ({
            fdi: c.tooth?.fdi_number,
            condition: c.condition,
            surface: c.surface?.name ?? null,
        }));
        const png = await (0, dental_chart_svg_util_js_1.renderToothChartPng)(chartConditions);
        const pdfBuffer = await new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 0,
                info: {
                    Title: `Dental Chart — ${patient.first_name} ${patient.last_name}`,
                    Author: clinic?.name ?? 'Clinic',
                },
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            (0, dental_chart_pdf_util_js_1.drawDentalChartPage)(doc, {
                clinicName: clinic?.name ?? 'Clinic',
                patientName: `${patient.first_name} ${patient.last_name}`,
                png,
                generatedAt: new Date(),
                conditions: conditions.map((c) => ({
                    fdi: c.tooth?.fdi_number,
                    tooth_name: c.tooth?.name ?? null,
                    condition: c.condition,
                    surface: c.surface?.name ?? null,
                    severity: c.severity ?? null,
                    notes: c.notes ?? null,
                })),
            });
            doc.end();
        });
        const key = `clinics/${clinicId}/patients/${patientId}/dental-chart.pdf`;
        await this.s3Service.upload(key, pdfBuffer, 'application/pdf');
        const url = await this.s3Service.getSignedUrl(key);
        return { url };
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
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service])
], ToothChartService);
//# sourceMappingURL=tooth-chart.service.js.map