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
exports.ListingVerificationService = exports.LISTING_VERIFICATION_DOC_PREFIX = exports.LISTING_PENDING_DOC_PREFIX = exports.LISTING_IMAGE_MIME_TYPES = exports.LISTING_VERIFICATION_MIME_TYPES = exports.LISTING_PENDING_JWT_HOURS = exports.LISTING_IMAGE_MAX_BYTES = exports.LISTING_VERIFICATION_MAX_BYTES = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const path_1 = require("path");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
exports.LISTING_VERIFICATION_MAX_BYTES = 10 * 1024 * 1024;
exports.LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
exports.LISTING_PENDING_JWT_HOURS = 24;
exports.LISTING_VERIFICATION_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]);
exports.LISTING_IMAGE_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp',
]);
exports.LISTING_PENDING_DOC_PREFIX = 'listings/verification/pending/';
exports.LISTING_VERIFICATION_DOC_PREFIX = 'listings/verification/';
const PHOTO_DOC_TYPES = new Set([
    'dentist_photo',
    'clinic_image',
]);
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
    validateFile(file, documentType) {
        if (!file) {
            throw new common_1.BadRequestException('Please upload a verification document (clinic photo, prescription pad, or invoice).');
        }
        const isPhotoType = documentType && PHOTO_DOC_TYPES.has(documentType);
        const maxBytes = isPhotoType ? exports.LISTING_IMAGE_MAX_BYTES : exports.LISTING_VERIFICATION_MAX_BYTES;
        if (file.size > maxBytes) {
            throw new common_1.BadRequestException(isPhotoType
                ? 'Images must be 5 MB or smaller.'
                : 'Verification document must be 10 MB or smaller.');
        }
        if (isPhotoType) {
            if (!exports.LISTING_IMAGE_MIME_TYPES.has(file.mimetype)) {
                throw new common_1.BadRequestException('Only JPEG, PNG, or WebP images are allowed for photos.');
            }
        }
        else if (!exports.LISTING_VERIFICATION_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException('Only JPEG, PNG, WebP images or PDF documents are allowed.');
        }
        if (!isPhotoType && exports.LISTING_IMAGE_MIME_TYPES.has(file.mimetype) && file.size > exports.LISTING_IMAGE_MAX_BYTES) {
            throw new common_1.BadRequestException('Image files must be 5 MB or smaller.');
        }
    }
    parsePendingToken(uploadToken) {
        try {
            const payload = this.jwt.verify(uploadToken);
            if (payload.type !== 'listing_pending_doc')
                throw new Error('wrong type');
            if (!payload.s3_key?.startsWith(exports.LISTING_PENDING_DOC_PREFIX))
                throw new Error('bad key');
            return payload;
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired upload token.');
        }
    }
    async isKeyClaimedByClinic(s3Key) {
        const clinic = await this.prisma.clinic.findFirst({
            where: {
                OR: [
                    { directory_verification_document_url: s3Key },
                    { directory_dentist_photo_url: s3Key },
                    { directory_clinic_image_url: s3Key },
                ],
            },
            select: { id: true },
        });
        return !!clinic;
    }
    async stagePendingUpload(file, documentType) {
        this.validateFile(file, documentType);
        const docExt = ((0, path_1.extname)(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')).toLowerCase();
        const s3Key = `${exports.LISTING_PENDING_DOC_PREFIX}${(0, crypto_1.randomUUID)()}${docExt}`;
        await this.s3.upload(s3Key, file.buffer, file.mimetype);
        const uploadToken = await this.jwt.signAsync({ s3_key: s3Key, document_type: documentType, type: 'listing_pending_doc' }, { expiresIn: `${exports.LISTING_PENDING_JWT_HOURS}h` });
        return { upload_token: uploadToken, expires_in_minutes: exports.LISTING_PENDING_JWT_HOURS * 60 };
    }
    async discardPendingUpload(uploadToken) {
        const payload = this.parsePendingToken(uploadToken);
        if (await this.isKeyClaimedByClinic(payload.s3_key)) {
            return { discarded: false };
        }
        await this.s3.delete(payload.s3_key);
        return { discarded: true };
    }
    async resolveStagedUpload(uploadToken, expectedType) {
        const payload = this.parsePendingToken(uploadToken);
        if (expectedType && payload.document_type !== expectedType) {
            throw new common_1.BadRequestException('Document type does not match the uploaded file.');
        }
        if (await this.isKeyClaimedByClinic(payload.s3_key)) {
            throw new common_1.BadRequestException('Verification upload expired or already used. Please re-upload your document.');
        }
        const headStatus = await this.s3.headObjectStatus(payload.s3_key);
        if (headStatus === 'denied') {
            throw new common_1.ServiceUnavailableException('Upload storage is temporarily unavailable. Please try again in a few minutes.');
        }
        if (headStatus === 'missing') {
            throw new common_1.BadRequestException('Verification upload expired or already used. Please re-upload your document.');
        }
        return {
            id: payload.s3_key,
            s3_key: payload.s3_key,
            document_type: payload.document_type,
        };
    }
    async uploadAndTrack(file, documentType) {
        this.validateFile(file, documentType);
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
    async discardOrphanKeys(s3Keys) {
        const unique = [...new Set(s3Keys.filter(Boolean))];
        await Promise.all(unique.map((key) => this.discardOrphanKey(key)));
    }
    async cleanupOrphanedPendingUploads() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const claimed = await this.prisma.clinic.findMany({
            where: {
                OR: [
                    { directory_verification_document_url: { startsWith: exports.LISTING_PENDING_DOC_PREFIX } },
                    { directory_dentist_photo_url: { startsWith: exports.LISTING_PENDING_DOC_PREFIX } },
                    { directory_clinic_image_url: { startsWith: exports.LISTING_PENDING_DOC_PREFIX } },
                ],
            },
            select: {
                directory_verification_document_url: true,
                directory_dentist_photo_url: true,
                directory_clinic_image_url: true,
            },
        });
        const claimedKeys = new Set();
        for (const c of claimed) {
            if (c.directory_verification_document_url)
                claimedKeys.add(c.directory_verification_document_url);
            if (c.directory_dentist_photo_url)
                claimedKeys.add(c.directory_dentist_photo_url);
            if (c.directory_clinic_image_url)
                claimedKeys.add(c.directory_clinic_image_url);
        }
        const objects = await this.s3.listObjectsByPrefix(exports.LISTING_PENDING_DOC_PREFIX);
        let cleaned = 0;
        for (const obj of objects) {
            if (claimedKeys.has(obj.key))
                continue;
            if (obj.lastModified && obj.lastModified.getTime() > cutoff)
                continue;
            await this.s3.delete(obj.key);
            cleaned++;
        }
        if (cleaned > 0) {
            this.logger.log(`Cleaned up ${cleaned} orphaned listing verification upload(s)`);
        }
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