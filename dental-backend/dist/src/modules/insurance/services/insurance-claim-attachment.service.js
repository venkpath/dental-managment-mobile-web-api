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
exports.InsuranceClaimAttachmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
const insurance_file_service_js_1 = require("./insurance-file.service.js");
const VALID_TYPES = new Set([
    'XRAY', 'CONSENT', 'TREATMENT_PLAN', 'PRESCRIPTION',
    'INVOICE_COPY', 'APPROVAL_LETTER', 'REJECTION_LETTER',
    'QUERY_LETTER', 'QUERY_RESPONSE', 'EOB', 'SETTLEMENT_LETTER', 'OTHER',
]);
let InsuranceClaimAttachmentService = class InsuranceClaimAttachmentService {
    prisma;
    files;
    constructor(prisma, files) {
        this.prisma = prisma;
        this.files = files;
    }
    async list(claimId, clinicId) {
        await this.assertClaimOwnership(claimId, clinicId);
        return this.prisma.insuranceClaimAttachment.findMany({
            where: { claim_id: claimId },
            orderBy: { uploaded_at: 'desc' },
        });
    }
    async upload(params) {
        const { claimId, clinicId, userId, type, description, file } = params;
        if (!VALID_TYPES.has(type)) {
            throw new common_1.NotFoundException(`Invalid attachment type: ${type}`);
        }
        await this.assertClaimOwnership(claimId, clinicId);
        const saved = await this.files.save({ clinicId, subdir: 'claim-attachments', file });
        return this.prisma.insuranceClaimAttachment.create({
            data: {
                claim_id: claimId,
                type,
                file_url: saved.file_url,
                file_name: saved.file_name,
                original_name: saved.original_name,
                mime_type: saved.mime_type,
                size_bytes: saved.size_bytes,
                uploaded_by_user_id: userId,
                description: description ?? null,
            },
        });
    }
    async delete(attachmentId, claimId, clinicId) {
        await this.assertClaimOwnership(claimId, clinicId);
        const attachment = await this.prisma.insuranceClaimAttachment.findFirst({
            where: { id: attachmentId, claim_id: claimId },
        });
        if (!attachment)
            throw new common_1.NotFoundException('Attachment not found');
        await this.files.remove(attachment.file_url);
        await this.prisma.insuranceClaimAttachment.delete({ where: { id: attachmentId } });
    }
    async getDownloadToken(attachmentId, claimId, clinicId) {
        await this.assertClaimOwnership(claimId, clinicId);
        const attachment = await this.prisma.insuranceClaimAttachment.findFirst({
            where: { id: attachmentId, claim_id: claimId },
            select: { file_url: true, original_name: true, mime_type: true },
        });
        if (!attachment)
            throw new common_1.NotFoundException('Attachment not found');
        const { token } = this.files.buildDownloadUrl({ clinicId, filePath: attachment.file_url });
        return { token, file_url: attachment.file_url, original_name: attachment.original_name };
    }
    serveFile(clinicId, filePath, token) {
        return this.files.resolveForServing({ clinicId, filePath, token });
    }
    async assertClaimOwnership(claimId, clinicId) {
        const claim = await this.prisma.insuranceClaim.findFirst({
            where: { id: claimId, clinic_id: clinicId },
            select: { id: true },
        });
        if (!claim)
            throw new common_1.ForbiddenException('Claim not found or access denied');
    }
};
exports.InsuranceClaimAttachmentService = InsuranceClaimAttachmentService;
exports.InsuranceClaimAttachmentService = InsuranceClaimAttachmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        insurance_file_service_js_1.InsuranceFileService])
], InsuranceClaimAttachmentService);
//# sourceMappingURL=insurance-claim-attachment.service.js.map