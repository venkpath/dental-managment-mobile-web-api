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
exports.ConsentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
const track_ai_usage_decorator_js_1 = require("../../common/decorators/track-ai-usage.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const consent_service_js_1 = require("./consent.service.js");
const consent_ai_prompt_js_1 = require("./consent-ai.prompt.js");
const dto_js_1 = require("./dto.js");
let ConsentController = class ConsentController {
    consents;
    constructor(consents) {
        this.consents = consents;
    }
    listLanguages() {
        return consent_ai_prompt_js_1.SUPPORTED_CONSENT_LANGUAGES;
    }
    list(req, language, code, isActive) {
        return this.consents.listTemplates(req.user.clinicId, {
            language,
            code,
            is_active: isActive === undefined ? undefined : isActive === 'true',
        });
    }
    get(req, id) {
        return this.consents.getTemplate(req.user.clinicId, id);
    }
    create(req, dto) {
        return this.consents.createTemplate(req.user.clinicId, req.user.userId, dto);
    }
    seedDefaults(req) {
        return this.consents.seedDefaults(req.user.clinicId, req.user.userId);
    }
    aiGenerate(req, dto) {
        return this.consents.aiGenerateTemplate(req.user.clinicId, req.user.userId, dto);
    }
    update(req, id, dto) {
        return this.consents.updateTemplate(req.user.clinicId, id, dto);
    }
    remove(req, id) {
        return this.consents.deleteTemplate(req.user.clinicId, id);
    }
    listForPatient(req, patientId) {
        return this.consents.listForPatient(req.user.clinicId, patientId);
    }
    createForPatient(req, patientId, dto) {
        return this.consents.createForPatient(req.user.clinicId, patientId, req.user.userId, dto);
    }
    download(req, id) {
        return this.consents.getDownloadUrl(req.user.clinicId, id);
    }
    signDigital(req, id, dto) {
        return this.consents.signDigital(req.user.clinicId, id, dto, req.user.userId);
    }
    signUpload(req, id, file, signedByName) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        return this.consents.signUpload(req.user.clinicId, id, { mimetype: file.mimetype, buffer: file.buffer, size: file.size }, signedByName, req.user.userId);
    }
    archive(req, id) {
        return this.consents.archive(req.user.clinicId, id);
    }
    sendLink(req, id, dto) {
        return this.consents.sendSignLink(req.user.clinicId, id, {
            channel: dto.channel,
            expires_in_hours: dto.expires_in_hours,
        });
    }
    publicGet(token) {
        return this.consents.getByPublicToken(token);
    }
    publicPdf(token) {
        return this.consents.getPublicPdfUrl(token);
    }
    publicRequestOtp(token) {
        return this.consents.requestPublicOtp(token);
    }
    publicVerifyOtp(token, dto) {
        return this.consents.verifyPublicOtp(token, dto.code);
    }
    publicSign(req, token, dto) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.ip ||
            req.socket?.remoteAddress ||
            '';
        const userAgent = req.headers['user-agent'] || '';
        return this.consents.signPublic(token, dto, { ip, user_agent: userAgent });
    }
};
exports.ConsentController = ConsentController;
__decorate([
    (0, common_1.Get)('consent-templates/languages'),
    (0, swagger_1.ApiOperation)({ summary: 'List supported consent template languages' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "listLanguages", null);
__decorate([
    (0, common_1.Get)('consent-templates'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST, create_user_dto_js_1.UserRole.STAFF),
    (0, swagger_1.ApiOperation)({ summary: 'List consent templates for the clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('language')),
    __param(2, (0, common_1.Query)('code')),
    __param(3, (0, common_1.Query)('is_active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('consent-templates/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST, create_user_dto_js_1.UserRole.STAFF),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('consent-templates'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a custom consent template' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_js_1.CreateConsentTemplateDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('consent-templates/seed-defaults'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Seed the 12 default English templates (idempotent)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "seedDefaults", null);
__decorate([
    (0, common_1.Post)('consent-templates/ai-generate'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_CONSENT_FORM'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a consent template with AI in any supported language' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_js_1.AiGenerateConsentTemplateDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "aiGenerate", null);
__decorate([
    (0, common_1.Patch)('consent-templates/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_js_1.UpdateConsentTemplateDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('consent-templates/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/consents'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST, create_user_dto_js_1.UserRole.STAFF),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "listForPatient", null);
__decorate([
    (0, common_1.Post)('patients/:patientId/consents'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a consent (unsigned) for the patient' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_js_1.CreatePatientConsentDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "createForPatient", null);
__decorate([
    (0, common_1.Get)('consents/:id/download'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST, create_user_dto_js_1.UserRole.STAFF),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "download", null);
__decorate([
    (0, common_1.Post)('consents/:id/sign-digital'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST),
    (0, swagger_1.ApiOperation)({ summary: 'Sign a consent using the in-app digital signature pad' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_js_1.SignDigitalConsentDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "signDigital", null);
__decorate([
    (0, common_1.Post)('consents/:id/sign-upload'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                signed_by_name: { type: 'string' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a scanned, paper-signed consent (PDF/PNG/JPEG ≤ 10MB)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('signed_by_name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "signUpload", null);
__decorate([
    (0, common_1.Post)('consents/:id/archive'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "archive", null);
__decorate([
    (0, common_1.Post)('consents/:id/send-link'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT, create_user_dto_js_1.UserRole.RECEPTIONIST),
    (0, swagger_1.ApiOperation)({
        summary: 'Send a one-time signing link to the patient via WhatsApp/SMS',
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_js_1.SendConsentLinkDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "sendLink", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 30 } }),
    (0, common_1.Get)('public/consents/:token'),
    (0, swagger_1.ApiOperation)({ summary: 'Public — fetch consent metadata by signing token' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "publicGet", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 20 } }),
    (0, common_1.Get)('public/consents/:token/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Public — get a presigned URL to view the unsigned PDF' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "publicPdf", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 3 } }),
    (0, common_1.Post)('public/consents/:token/request-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Public — send a one-time code to the patient phone' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "publicRequestOtp", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 10 } }),
    (0, common_1.Post)('public/consents/:token/verify-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Public — verify the OTP entered on the sign page' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_js_1.VerifyConsentOtpDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "publicVerifyOtp", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('public/consents/:token/sign'),
    (0, swagger_1.ApiOperation)({ summary: 'Public — submit signature, finalise consent' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_js_1.PublicSignConsentDto]),
    __metadata("design:returntype", void 0)
], ConsentController.prototype, "publicSign", null);
exports.ConsentController = ConsentController = __decorate([
    (0, swagger_1.ApiTags)('Consent Forms'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [consent_service_js_1.ConsentService])
], ConsentController);
//# sourceMappingURL=consent.controller.js.map