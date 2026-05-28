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
var TreatmentMediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreatmentMediaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const crypto_1 = require("crypto");
const path_1 = require("path");
const sharp_1 = __importDefault(require("sharp"));
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_MIMES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/dicom',
];
const MEDIA_INCLUDE = {
    uploader: { select: { id: true, name: true, role: true } },
};
let TreatmentMediaService = TreatmentMediaService_1 = class TreatmentMediaService {
    prisma;
    s3;
    logger = new common_1.Logger(TreatmentMediaService_1.name);
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async upload(clinicId, params) {
        if (!ALLOWED_MIMES.includes(params.file.mimetype)) {
            throw new common_1.BadRequestException(`Unsupported file type: ${params.file.mimetype}`);
        }
        const treatment = await this.prisma.treatment.findUnique({ where: { id: params.treatmentId } });
        if (!treatment || treatment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Treatment not found in this clinic');
        }
        const originalSize = params.file.buffer.length;
        let storedBuffer = params.file.buffer;
        let storedMime = params.file.mimetype;
        let storedExt = (0, path_1.extname)(params.file.originalname).toLowerCase() || '.bin';
        if (IMAGE_MIMES.has(params.file.mimetype)) {
            storedBuffer = await (0, sharp_1.default)(params.file.buffer)
                .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer();
            storedMime = 'image/jpeg';
            storedExt = '.jpg';
        }
        const fileName = `${(0, crypto_1.randomUUID)()}${storedExt}`;
        const s3Key = `clinics/${clinicId}/treatment-media/${params.treatmentId}/${fileName}`;
        await this.s3.upload(s3Key, storedBuffer, storedMime);
        const storedSize = storedBuffer.length;
        this.logger.log(`TreatmentMedia upload: treatment=${params.treatmentId} type=${params.mediaType} ` +
            `original=${originalSize}B stored=${storedSize}B (${Math.round((1 - storedSize / originalSize) * 100)}% reduction) key=${s3Key}`);
        return this.prisma.treatmentMedia.create({
            data: {
                clinic_id: clinicId,
                branch_id: params.branchId,
                patient_id: treatment.patient_id,
                treatment_id: params.treatmentId,
                file_url: s3Key,
                file_name: fileName,
                original_name: params.file.originalname,
                mime_type: storedMime,
                media_type: params.mediaType,
                original_size: originalSize,
                stored_size: storedSize,
                visit_date: new Date(params.visitDate),
                caption: params.caption,
                uploaded_by: params.uploadedBy,
            },
            include: MEDIA_INCLUDE,
        });
    }
    async findByTreatment(clinicId, treatmentId) {
        const treatment = await this.prisma.treatment.findUnique({ where: { id: treatmentId } });
        if (!treatment || treatment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Treatment not found in this clinic');
        }
        return this.prisma.treatmentMedia.findMany({
            where: { clinic_id: clinicId, treatment_id: treatmentId },
            orderBy: [{ visit_date: 'desc' }, { created_at: 'desc' }],
            include: MEDIA_INCLUDE,
        });
    }
    async findByPatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Patient not found in this clinic');
        }
        return this.prisma.treatmentMedia.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            orderBy: [{ visit_date: 'desc' }, { created_at: 'desc' }],
            include: {
                ...MEDIA_INCLUDE,
                treatment: { select: { id: true, procedure: true, status: true } },
            },
        });
    }
    async findById(clinicId, id) {
        const media = await this.prisma.treatmentMedia.findUnique({ where: { id } });
        if (!media || media.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Media not found');
        }
        return media;
    }
    async getSignedUrl(clinicId, id) {
        const media = await this.findById(clinicId, id);
        return this.s3.getSignedUrl(media.file_url);
    }
    async remove(clinicId, id) {
        const media = await this.findById(clinicId, id);
        await this.s3.delete(media.file_url);
        await this.prisma.treatmentMedia.delete({ where: { id } });
        return { deleted: true };
    }
};
exports.TreatmentMediaService = TreatmentMediaService;
exports.TreatmentMediaService = TreatmentMediaService = TreatmentMediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service])
], TreatmentMediaService);
//# sourceMappingURL=treatment-media.service.js.map