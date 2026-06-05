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
var ListingVerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingVerificationService = exports.LISTING_VERIFICATION_DOC_PREFIX = exports.LISTING_PENDING_DOC_PREFIX = exports.LISTING_VERIFICATION_MIME_TYPES = exports.LISTING_VERIFICATION_MAX_BYTES = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const path_1 = require("path");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
exports.LISTING_VERIFICATION_MAX_BYTES = 10 * 1024 * 1024;
exports.LISTING_VERIFICATION_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]);
exports.LISTING_PENDING_DOC_PREFIX = 'listings/verification/pending/';
exports.LISTING_VERIFICATION_DOC_PREFIX = 'listings/verification/';
let ListingVerificationService = ListingVerificationService_1 = class ListingVerificationService {
    prisma;
    s3;
    jwt;
    logger = new common_1.Logger(ListingVerificationService_1.name);
    constructor(prisma, s3, jwt) {
        this.prisma = prisma;
        this.s3 = s3;
        this.jwt = jwt;
    }
    validateFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('Please upload a verification document (clinic photo, prescription pad, or invoice).');
        }
        if (file.size > exports.LISTING_VERIFICATION_MAX_BYTES) {
            throw new common_1.BadRequestException('Verification document must be 10 MB or smaller.');
        }
        if (!exports.LISTING_VERIFICATION_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException('Only JPEG, PNG, WebP images or PDF documents are allowed.');
        }
    }
    async stagePendingUpload(file, documentType) {
        this.validateFile(file);
        const docExt = ((0, path_1.extname)(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')).toLowerCase();
        const s3Key = `${exports.LISTING_PENDING_DOC_PREFIX}${(0, crypto_1.randomUUID)()}${docExt}`;
        await this.s3.upload(s3Key, file.buffer, file.mimetype);
        const row = await this.prisma.directoryListingUpload.create({
            data: { s3_key: s3Key, document_type: documentType },
        });
        const uploadToken = await this.jwt.signAsync({ upload_id: row.id, s3_key: s3Key, type: 'listing_pending_doc' }, { expiresIn: '2h' });
        return { upload_token: uploadToken, expires_in_minutes: 120 };
    }
    async discardPendingUpload(uploadToken) {
        let payload;
        try {
            payload = await this.jwt.verifyAsync(uploadToken);
            if (payload.type !== 'listing_pending_doc')
                throw new Error('wrong type');
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired upload token.');
        }
        const row = await this.prisma.directoryListingUpload.findUnique({
            where: { id: payload.upload_id },
        });
        if (!row || row.claimed_at) {
            return { discarded: false };
        }
        if (row.s3_key !== payload.s3_key || !row.s3_key.startsWith(exports.LISTING_PENDING_DOC_PREFIX)) {
            throw new common_1.BadRequestException('Invalid upload reference.');
        }
        await this.s3.delete(row.s3_key);
        await this.prisma.directoryListingUpload.delete({ where: { id: row.id } });
        return { discarded: true };
    }
    async resolveStagedUpload(uploadToken, expectedType) {
        let payload;
        try {
            payload = await this.jwt.verifyAsync(uploadToken);
            if (payload.type !== 'listing_pending_doc')
                throw new Error('wrong type');
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired verification upload. Please re-upload your document.');
        }
        const row = await this.prisma.directoryListingUpload.findUnique({
            where: { id: payload.upload_id },
        });
        if (!row || row.claimed_at) {
            throw new common_1.BadRequestException('Verification upload expired or already used. Please re-upload your document.');
        }
        if (row.s3_key !== payload.s3_key || !row.s3_key.startsWith(exports.LISTING_PENDING_DOC_PREFIX)) {
            throw new common_1.BadRequestException('Invalid verification upload reference.');
        }
        if (expectedType && row.document_type !== expectedType) {
            throw new common_1.BadRequestException('Document type does not match the uploaded file.');
        }
        return row;
    }
    async claimStagedUpload(uploadId, clinicId) {
        await this.prisma.directoryListingUpload.update({
            where: { id: uploadId },
            data: { claimed_at: new Date(), clinic_id: clinicId },
        });
    }
    async uploadAndTrack(file, _documentType) {
        this.validateFile(file);
        const docExt = ((0, path_1.extname)(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')).toLowerCase();
        const s3Key = `${exports.LISTING_VERIFICATION_DOC_PREFIX}${(0, crypto_1.randomUUID)()}${docExt}`;
        await this.s3.upload(s3Key, file.buffer, file.mimetype);
        return s3Key;
    }
    async discardOrphanKey(s3Key) {
        if (s3Key.startsWith(exports.LISTING_PENDING_DOC_PREFIX) || s3Key.startsWith(exports.LISTING_VERIFICATION_DOC_PREFIX)) {
            await this.s3.delete(s3Key);
        }
    }
    async cleanupOrphanedPendingUploads() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const orphans = await this.prisma.directoryListingUpload.findMany({
            where: { claimed_at: null, created_at: { lt: cutoff } },
            select: { id: true, s3_key: true },
            take: 200,
        });
        if (!orphans.length)
            return;
        for (const row of orphans) {
            await this.s3.delete(row.s3_key);
            await this.prisma.directoryListingUpload.delete({ where: { id: row.id } });
        }
        this.logger.log(`Cleaned up ${orphans.length} orphaned listing verification upload(s)`);
    }
};
exports.ListingVerificationService = ListingVerificationService;
__decorate([
    (0, schedule_1.Cron)('0 30 11 * * *', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ListingVerificationService.prototype, "cleanupOrphanedPendingUploads", null);
exports.ListingVerificationService = ListingVerificationService = ListingVerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service,
        jwt_1.JwtService])
], ListingVerificationService);
//# sourceMappingURL=listing-verification.service.js.map