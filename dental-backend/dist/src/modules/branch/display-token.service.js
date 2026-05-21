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
exports.DisplayTokenService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let DisplayTokenService = class DisplayTokenService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    generateToken() {
        return (0, crypto_1.randomBytes)(9).toString('hex');
    }
    getBaseUrl() {
        return this.config.get('FRONTEND_URL') ?? 'http://localhost:3001';
    }
    async generate(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: branchId },
            include: { clinic: { select: { name: true } } },
        });
        if (!branch || branch.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Branch not found');
        let token;
        let attempts = 0;
        do {
            token = this.generateToken();
            const existing = await this.prisma.branch.findUnique({ where: { display_token: token } });
            if (!existing)
                break;
            if (++attempts > 10)
                throw new common_1.BadRequestException('Could not generate unique display token');
        } while (true);
        await this.prisma.branch.update({
            where: { id: branchId },
            data: { display_token: token, display_token_enabled: true },
        });
        return {
            token,
            display_url: `${this.getBaseUrl()}/display/${token}`,
            branch_name: branch.name,
            enabled: true,
        };
    }
    async get(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: branchId },
            include: { clinic: { select: { name: true } } },
        });
        if (!branch || branch.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Branch not found');
        if (!branch.display_token) {
            return { enabled: false, token: null, display_url: null, branch_name: branch.name };
        }
        return {
            token: branch.display_token,
            display_url: `${this.getBaseUrl()}/display/${branch.display_token}`,
            branch_name: branch.name,
            enabled: branch.display_token_enabled,
        };
    }
    async revoke(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch || branch.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Branch not found');
        await this.prisma.branch.update({
            where: { id: branchId },
            data: { display_token: null, display_token_enabled: false },
        });
        return { message: 'Display link revoked' };
    }
};
exports.DisplayTokenService = DisplayTokenService;
exports.DisplayTokenService = DisplayTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService])
], DisplayTokenService);
//# sourceMappingURL=display-token.service.js.map