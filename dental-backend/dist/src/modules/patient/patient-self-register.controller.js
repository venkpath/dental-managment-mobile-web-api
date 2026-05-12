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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientSelfRegisterController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const qr_code_service_js_1 = require("../branch/qr-code.service.js");
const plan_limit_service_js_1 = require("../../common/services/plan-limit.service.js");
const self_register_patient_dto_js_1 = require("./dto/self-register-patient.dto.js");
function digitsOnly(phone) {
    return phone.replace(/\D/g, '');
}
function last10(phone) {
    const d = digitsOnly(phone);
    return d.length >= 10 ? d.slice(-10) : d;
}
function normalizeName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
let PatientSelfRegisterController = class PatientSelfRegisterController {
    prisma;
    qrCodeService;
    planLimit;
    constructor(prisma, qrCodeService, planLimit) {
        this.prisma = prisma;
        this.qrCodeService = qrCodeService;
        this.planLimit = planLimit;
    }
    async getBranchInfo(token) {
        const branch = await this.qrCodeService.findBranchByToken(token);
        const { clinic } = branch;
        let logo_path = null;
        if (clinic?.logo_url) {
            const filename = clinic.logo_url.split('/').pop();
            if (filename) {
                logo_path = `clinics/logo/${clinic.id}/${filename}`;
            }
        }
        return {
            branch_name: branch.name,
            clinic_name: clinic?.name ?? '',
            city: branch.city ?? '',
            logo_path,
        };
    }
    async selfRegister(token, dto) {
        const branch = await this.qrCodeService.findBranchByToken(token);
        const clinicId = branch.clinic_id;
        if (!dto.phone || dto.phone.trim() === '') {
            throw new common_1.BadRequestException('Phone number is required');
        }
        const phone = dto.phone.trim();
        const phoneLast10 = last10(phone);
        if (phoneLast10.length < 10) {
            throw new common_1.BadRequestException('Please enter a valid 10-digit mobile number');
        }
        const firstNameNorm = normalizeName(dto.first_name);
        const lastNameNorm = normalizeName(dto.last_name);
        const candidates = await this.prisma.patient.findMany({
            where: { clinic_id: clinicId, phone: { contains: phoneLast10 } },
            select: { id: true, first_name: true, last_name: true, phone: true },
        });
        const duplicate = candidates.find((c) => last10(c.phone) === phoneLast10 &&
            normalizeName(c.first_name) === firstNameNorm &&
            normalizeName(c.last_name) === lastNameNorm);
        if (duplicate) {
            return {
                success: true,
                message: 'You are already registered at this clinic.',
                already_registered: true,
            };
        }
        await this.planLimit.enforceMonthlyCap(clinicId, 'patients');
        const patient = await this.prisma.patient.create({
            data: {
                clinic_id: clinicId,
                branch_id: branch.id,
                first_name: dto.first_name.trim(),
                last_name: dto.last_name.trim(),
                phone,
                email: dto.email?.trim() || undefined,
                gender: dto.gender ?? 'Other',
                ...(dto.date_of_birth ? { date_of_birth: new Date(dto.date_of_birth) } : {}),
                ...(dto.age !== undefined ? { age: dto.age } : {}),
            },
            select: { id: true, first_name: true, last_name: true },
        });
        return {
            success: true,
            message: `Welcome, ${patient.first_name}! You have been registered successfully.`,
            already_registered: false,
            patient_id: patient.id,
        };
    }
};
exports.PatientSelfRegisterController = PatientSelfRegisterController;
__decorate([
    (0, common_1.Get)('branch-info/:token'),
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 30 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Get branch info for a QR token (shown on the registration form)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Branch name, clinic name and logo for display on the form' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PatientSelfRegisterController.prototype, "getBranchInfo", null);
__decorate([
    (0, common_1.Post)('self-register/:token'),
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Patient self-registration via branch QR code' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Patient registered successfully' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, self_register_patient_dto_js_1.SelfRegisterPatientDto]),
    __metadata("design:returntype", Promise)
], PatientSelfRegisterController.prototype, "selfRegister", null);
exports.PatientSelfRegisterController = PatientSelfRegisterController = __decorate([
    (0, swagger_1.ApiTags)('Patient Self-Registration (Public)'),
    (0, common_1.Controller)('public/patients'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        qr_code_service_js_1.QrCodeService,
        plan_limit_service_js_1.PlanLimitService])
], PatientSelfRegisterController);
//# sourceMappingURL=patient-self-register.controller.js.map