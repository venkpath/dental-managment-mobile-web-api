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
var AttachmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const ATTACHMENT_INCLUDE = {
    branch: { select: { id: true, name: true } },
    patient: { select: { id: true, first_name: true, last_name: true } },
    uploader: { select: { id: true, name: true, email: true, role: true } },
};
const UPLOAD_DIR = 'uploads/attachments';
let AttachmentService = AttachmentService_1 = class AttachmentService {
    prisma;
    logger = new common_1.Logger(AttachmentService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async uploadFile(clinicId, params) {
        const branch = await this.prisma.branch.findUnique({ where: { id: params.branchId } });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Branch not found in this clinic');
        }
        const patient = await this.prisma.patient.findUnique({ where: { id: params.patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Patient not found in this clinic');
        }
        const ext = (0, path_1.extname)(params.file.originalname) || '.bin';
        const fileName = `${(0, crypto_1.randomUUID)()}${ext}`;
        const dir = `${UPLOAD_DIR}/${clinicId}`;
        await (0, promises_1.mkdir)((0, path_1.join)(process.cwd(), dir), { recursive: true });
        const filePath = `${dir}/${fileName}`;
        await (0, promises_1.writeFile)((0, path_1.join)(process.cwd(), filePath), params.file.buffer);
        this.logger.log(`Creating attachment: clinic=${clinicId}, patient=${params.patientId}, branch=${params.branchId}, user=${params.uploadedBy}, type=${params.type}, file=${filePath}`);
        return this.prisma.attachment.create({
            data: {
                clinic_id: clinicId,
                branch_id: params.branchId,
                patient_id: params.patientId,
                uploaded_by: params.uploadedBy,
                type: params.type,
                file_url: filePath,
                file_name: fileName,
                original_name: params.file.originalname,
                mime_type: params.file.mimetype,
            },
            include: ATTACHMENT_INCLUDE,
        });
    }
    async findByPatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Patient not found in this clinic');
        }
        return this.prisma.attachment.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            orderBy: { created_at: 'desc' },
            include: ATTACHMENT_INCLUDE,
        });
    }
    async findById(clinicId, id) {
        const attachment = await this.prisma.attachment.findUnique({ where: { id } });
        if (!attachment || attachment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Attachment not found');
        }
        return attachment;
    }
    async updateAnalysis(clinicId, id, analysis) {
        const attachment = await this.findById(clinicId, id);
        return this.prisma.attachment.update({
            where: { id: attachment.id },
            data: { ai_analysis: analysis },
            include: ATTACHMENT_INCLUDE,
        });
    }
    async remove(clinicId, id) {
        const attachment = await this.findById(clinicId, id);
        try {
            await (0, promises_1.unlink)((0, path_1.join)(process.cwd(), attachment.file_url));
        }
        catch { }
        await this.prisma.attachment.delete({ where: { id: attachment.id } });
        return { deleted: true };
    }
};
exports.AttachmentService = AttachmentService;
exports.AttachmentService = AttachmentService = AttachmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], AttachmentService);
//# sourceMappingURL=attachment.service.js.map