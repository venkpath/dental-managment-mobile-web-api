"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCodeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const QRCode = __importStar(require("qrcode"));
const prisma_service_js_1 = require("../../database/prisma.service.js");
let QrCodeService = class QrCodeService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    generateToken() {
        return (0, crypto_1.randomBytes)(5).toString('hex').toUpperCase();
    }
    getBaseUrl() {
        return this.config.get('FRONTEND_URL') ?? 'http://localhost:5173';
    }
    async generate(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: branchId },
            include: { clinic: { select: { name: true } } },
        });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch not found`);
        }
        let token;
        let attempts = 0;
        do {
            token = this.generateToken();
            const existing = await this.prisma.branch.findUnique({ where: { qr_code_token: token } });
            if (!existing)
                break;
            attempts++;
            if (attempts > 10)
                throw new common_1.BadRequestException('Could not generate unique QR token');
        } while (true);
        await this.prisma.branch.update({
            where: { id: branchId },
            data: {
                qr_code_token: token,
                qr_code_enabled: true,
                qr_code_generated_at: new Date(),
            },
        });
        const selfRegisterUrl = `${this.getBaseUrl()}/self-register?token=${token}`;
        const qrDataUrl = await QRCode.toDataURL(selfRegisterUrl, {
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        });
        return {
            token,
            qr_link: selfRegisterUrl,
            qr_data_url: qrDataUrl,
            clinic_name: branch.clinic.name,
            branch_name: branch.name,
            enabled: true,
            generated_at: new Date(),
        };
    }
    async get(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: branchId },
            include: { clinic: { select: { name: true } } },
        });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch not found`);
        }
        if (!branch.qr_code_token) {
            return { enabled: false, token: null, qr_link: null, qr_data_url: null, clinic_name: branch.clinic.name, generated_at: null };
        }
        const selfRegisterUrl = `${this.getBaseUrl()}/self-register?token=${branch.qr_code_token}`;
        const qrDataUrl = branch.qr_code_enabled
            ? await QRCode.toDataURL(selfRegisterUrl, {
                width: 400,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
            })
            : null;
        return {
            token: branch.qr_code_token,
            qr_link: selfRegisterUrl,
            qr_data_url: qrDataUrl,
            clinic_name: branch.clinic.name,
            branch_name: branch.name,
            enabled: branch.qr_code_enabled,
            generated_at: branch.qr_code_generated_at,
        };
    }
    async disable(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch not found`);
        }
        await this.prisma.branch.update({
            where: { id: branchId },
            data: { qr_code_enabled: false },
        });
        return { message: 'QR code disabled' };
    }
    async findBranchByToken(token) {
        const branch = await this.prisma.branch.findUnique({
            where: { qr_code_token: token },
            include: { clinic: { select: { id: true, name: true, logo_url: true } } },
        });
        if (!branch)
            throw new common_1.NotFoundException('Invalid or expired QR code');
        if (!branch.qr_code_enabled)
            throw new common_1.BadRequestException('QR code is disabled');
        return branch;
    }
};
exports.QrCodeService = QrCodeService;
exports.QrCodeService = QrCodeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService])
], QrCodeService);
//# sourceMappingURL=qr-code.service.js.map