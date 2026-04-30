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
const path_1 = require("path");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const automation_service_js_1 = require("../automation/automation.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const prescription_pdf_service_js_1 = require("./prescription-pdf.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const name_util_js_1 = require("../../common/utils/name.util.js");
const PRESCRIPTION_INCLUDE = {
    items: true,
    patient: true,
    dentist: true,
    branch: true,
    clinical_visit: true,
};
let PrescriptionService = class PrescriptionService {
    prisma;
    pdfService;
    s3Service;
    communicationService;
    automationService;
    constructor(prisma, pdfService, s3Service, communicationService, automationService) {
        this.prisma = prisma;
        this.pdfService = pdfService;
        this.s3Service = s3Service;
        this.communicationService = communicationService;
        this.automationService = automationService;
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
        if (dto.clinical_visit_id) {
            const clinicalVisit = await this.prisma.clinicalVisit.findUnique({
                where: { id: dto.clinical_visit_id },
            });
            if (!clinicalVisit || clinicalVisit.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Clinical visit with ID "${dto.clinical_visit_id}" not found in this clinic`);
            }
        }
        const { items, ...rest } = dto;
        return this.prisma.$transaction(async (tx) => {
            return tx.prescription.create({
                data: {
                    ...rest,
                    clinic_id: clinicId,
                    ...(items && items.length > 0 ? { items: { create: items } } : {}),
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
        if (query.dentist_id) {
            where.dentist_id = query.dentist_id;
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
    async getPdfUrl(clinicId, id, options = {}) {
        const withBackground = options.withBackground !== false;
        const prescription = await this.findOne(clinicId, id);
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { name: true, phone: true, email: true, address: true, city: true, state: true },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        const branch = prescription.branch;
        const patient = prescription.patient;
        const dentist = prescription.dentist;
        const clinicalVisit = prescription.clinical_visit;
        let signatureBuffer = null;
        if (dentist?.signature_url) {
            signatureBuffer = await this.s3Service.getObject(dentist.signature_url);
        }
        let visitTreatments = [];
        if (prescription.clinical_visit_id) {
            visitTreatments = await this.prisma.treatment.findMany({
                where: {
                    clinical_visit_id: prescription.clinical_visit_id,
                    clinic_id: clinicId,
                },
                select: { procedure: true, tooth_number: true, notes: true, status: true },
                orderBy: { created_at: 'asc' },
            });
        }
        let templatePayload;
        if (branch?.prescription_template_enabled &&
            branch.prescription_template_url &&
            branch.prescription_template_config) {
            const templatesRoot = (0, path_1.resolve)(process.cwd(), 'uploads/prescription-templates');
            const absImagePath = (0, path_1.resolve)(process.cwd(), branch.prescription_template_url);
            if (absImagePath.startsWith(templatesRoot) && (0, fs_1.existsSync)(absImagePath)) {
                const imageBuffer = await (0, promises_1.readFile)(absImagePath);
                templatePayload = {
                    config: branch.prescription_template_config,
                    imageBuffer,
                    withBackground,
                };
            }
        }
        const pdfBuffer = await this.pdfService.generate({
            id: prescription.id,
            created_at: prescription.created_at,
            diagnosis: prescription.diagnosis,
            instructions: prescription.instructions,
            chief_complaint: prescription.chief_complaint,
            past_dental_history: prescription.past_dental_history,
            allergies_medical_history: prescription.allergies_medical_history,
            review_after_date: clinicalVisit?.review_after_date ?? null,
            clinic: {
                name: clinic.name,
                phone: clinic.phone,
                email: clinic.email,
                address: clinic.address,
                city: clinic.city,
                state: clinic.state,
            },
            branch: {
                name: branch?.name ?? clinic.name,
                phone: branch?.phone,
                address: branch?.address,
                city: branch?.city,
                state: branch?.state,
            },
            patient: {
                id: patient.id,
                first_name: patient.first_name,
                last_name: patient.last_name,
                phone: patient.phone,
                email: patient.email,
                date_of_birth: patient.date_of_birth,
                gender: patient.gender,
            },
            dentist: {
                name: dentist?.name ?? 'Unknown',
                specialization: dentist?.specialization,
                qualification: dentist?.qualification,
                license_number: dentist?.license_number,
                signature_image: signatureBuffer,
            },
            items: prescription.items ?? [],
            treatments: visitTreatments,
            template: templatePayload,
        });
        const variant = templatePayload
            ? (withBackground ? 'tmpl-bg' : 'tmpl-nobg')
            : 'default';
        const key = `clinics/${clinicId}/prescriptions/${id}/prescription-${variant}.pdf`;
        await this.s3Service.upload(key, pdfBuffer, 'application/pdf');
        const url = await this.s3Service.getSignedUrl(key);
        return { url };
    }
    async sendWhatsApp(clinicId, id) {
        const prescription = await this.findOne(clinicId, id);
        const { url: pdfUrl } = await this.getPdfUrl(clinicId, id);
        const patient = prescription.patient;
        const dentist = prescription.dentist;
        const [clinic, rule] = await Promise.all([
            this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { name: true, phone: true },
            }),
            this.automationService.getRuleConfig(clinicId, 'prescription_ready'),
        ]);
        if (rule && !rule.is_enabled) {
            return { message: 'Prescription send is disabled — enable it in Automation Rules.' };
        }
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const clinicName = clinic?.name ?? 'your clinic';
        const clinicPhone = clinic?.phone ?? '';
        const doctorName = dentist?.name ? (0, name_util_js_1.formatDoctorName)(dentist.name) : 'your doctor';
        const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
        const redirectUrl = `${apiBase}/public/prescription-redirect/${id}?clinic=${clinicId}`;
        const channel = (rule?.channel && rule.channel !== 'preferred')
            ? rule.channel
            : 'whatsapp';
        const variables = {
            '1': patientName,
            '2': doctorName,
            '3': clinicName,
            '4': clinicPhone,
            patient_name: patientName,
            patient_first_name: patient.first_name,
            clinic_name: clinicName,
            clinic_phone: clinicPhone,
            doctor_name: doctorName,
            link: redirectUrl,
        };
        const templateName = rule?.template?.template_name || '';
        const isPdfTemplate = /_pdf$/i.test(templateName);
        const headerMedia = isPdfTemplate
            ? {
                type: 'document',
                url: pdfUrl,
                filename: `Prescription-${patient.first_name}-${patient.last_name}.pdf`.replace(/\s+/g, '-'),
            }
            : undefined;
        await this.communicationService.sendMessage(clinicId, {
            patient_id: prescription.patient_id,
            channel: channel,
            category: 'transactional',
            template_id: rule?.template_id ?? undefined,
            body: rule?.template_id
                ? undefined
                : `Hello ${patientName},\n\nYour prescription from ${(0, name_util_js_1.formatDoctorName)(doctorName)} at ${clinicName} has been generated.\n\nView & Download:\n${redirectUrl}\n\nFor any queries, please reach us at ${clinicPhone} during clinic hours.`,
            variables,
            metadata: {
                automation: 'prescription_ready',
                prescription_id: id,
                button_url_suffix: redirectUrl,
                ...(headerMedia ? { whatsapp_header_media: headerMedia } : {}),
            },
        });
        return { message: 'Prescription sent' };
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
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        prescription_pdf_service_js_1.PrescriptionPdfService,
        s3_service_js_1.S3Service,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService])
], PrescriptionService);
//# sourceMappingURL=prescription.service.js.map