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
var InsuranceFileService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceFileService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
const UPLOAD_ROOT = 'uploads/insurance';
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/zip',
]);
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
let InsuranceFileService = InsuranceFileService_1 = class InsuranceFileService {
    jwt;
    logger = new common_1.Logger(InsuranceFileService_1.name);
    constructor(jwt) {
        this.jwt = jwt;
    }
    async save(params) {
        const { clinicId, subdir, file } = params;
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`);
        }
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException(`Unsupported file type: ${file.mimetype}`);
        }
        if (!/^[a-z0-9-]+$/i.test(subdir)) {
            throw new common_1.BadRequestException('Invalid storage subdir');
        }
        const ext = (0, path_1.extname)(file.originalname) || '.bin';
        const fileName = `${(0, crypto_1.randomUUID)()}${ext}`;
        const dir = `${UPLOAD_ROOT}/${clinicId}/${subdir}`;
        await (0, promises_1.mkdir)((0, path_1.join)(process.cwd(), dir), { recursive: true });
        const filePath = `${dir}/${fileName}`;
        await (0, promises_1.writeFile)((0, path_1.join)(process.cwd(), filePath), file.buffer);
        this.logger.log(`Saved insurance file: clinic=${clinicId} subdir=${subdir} path=${filePath}`);
        return {
            file_url: filePath,
            file_name: fileName,
            original_name: file.originalname,
            mime_type: file.mimetype,
            size_bytes: file.size,
        };
    }
    async remove(filePath) {
        if (!filePath)
            return;
        try {
            const abs = this.resolveSafe(filePath);
            await (0, promises_1.unlink)(abs);
        }
        catch {
        }
    }
    buildDownloadUrl(params) {
        const token = this.jwt.sign({ clinic_id: params.clinicId, file: params.filePath }, { expiresIn: params.expiresInSec ?? 3600 });
        return { token };
    }
    resolveForServing(params) {
        let payload;
        try {
            payload = this.jwt.verify(params.token);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        if (payload.clinic_id !== params.clinicId || payload.file !== params.filePath) {
            throw new common_1.UnauthorizedException('Token does not match the requested file');
        }
        const abs = this.resolveSafe(params.filePath);
        if (!(0, fs_1.existsSync)(abs))
            throw new common_1.NotFoundException('File not found on disk');
        return abs;
    }
    resolveSafe(filePath) {
        const uploadsBase = (0, path_1.resolve)(process.cwd(), 'uploads');
        const abs = (0, path_1.resolve)(process.cwd(), filePath);
        if (!abs.startsWith(uploadsBase)) {
            throw new common_1.BadRequestException('Invalid file path');
        }
        return abs;
    }
};
exports.InsuranceFileService = InsuranceFileService;
exports.InsuranceFileService = InsuranceFileService = InsuranceFileService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], InsuranceFileService);
//# sourceMappingURL=insurance-file.service.js.map