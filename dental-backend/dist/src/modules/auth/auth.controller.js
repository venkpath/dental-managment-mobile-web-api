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
exports.AuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const auth_service_js_1 = require("./auth.service.js");
const index_js_1 = require("./dto/index.js");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async lookup(dto) {
        return this.authService.lookup(dto);
    }
    async login(dto, req, res) {
        const result = await this.authService.login(dto, req);
        const isProduction = process.env['NODE_ENV'] === 'production';
        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000,
        });
        return result;
    }
    async lookupByPhone(dto) {
        return this.authService.lookupByPhone(dto.phone, dto.password);
    }
    async loginByPhone(dto, req, res) {
        const result = await this.authService.loginByPhone(dto.phone, dto.password, dto.clinic_id, req);
        const isProduction = process.env['NODE_ENV'] === 'production';
        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000,
        });
        return result;
    }
    async refresh(dto, res) {
        const result = await this.authService.refresh(dto.refresh_token);
        const isProduction = process.env['NODE_ENV'] === 'production';
        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000,
        });
        return result;
    }
    async changePassword(user, dto) {
        return this.authService.changePassword(user.sub, dto);
    }
    async register(dto) {
        return this.authService.register(dto);
    }
    async sendVerificationEmail(user) {
        return this.authService.sendVerificationEmail(user.sub, user.clinic_id);
    }
    async verifyEmail(body) {
        return this.authService.verifyEmail(body.token);
    }
    async forgotPassword(body) {
        return this.authService.requestPasswordReset(body.email, body.clinic_id);
    }
    async resetPassword(body) {
        return this.authService.resetPassword(body.token, body.new_password);
    }
    async sendPhoneOtp(user, body) {
        return this.authService.sendOtp(body.phone, user.clinic_id, 'sms');
    }
    async verifyPhone(user, body) {
        return this.authService.verifyPhone(user.sub, user.clinic_id, body.phone, body.code);
    }
    async getClaimPreview(clinicId) {
        return this.authService.getClaimPreview(clinicId);
    }
    async claimDirectoryListing(body) {
        return this.authService.claimDirectoryListing(body);
    }
    async sendRegistrationOtp(body) {
        return this.authService.sendRegistrationOtp(body.phone);
    }
    async verifyRegistrationOtp(body) {
        return this.authService.verifyRegistrationOtp(body.phone, body.code);
    }
    async sendOtp(body) {
        return this.authService.sendOtp(body.identifier, body.clinic_id, body.channel);
    }
    async verifyOtp(body) {
        return this.authService.verifyOtp(body.identifier, body.clinic_id, body.code);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('lookup'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Look up clinics for an email/password combination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of clinics the user belongs to' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.LookupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "lookup", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login with email, password and clinic_id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login successful' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials or inactive account' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many login attempts' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('lookup-by-phone'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Look up clinics for a phone/password combination (phone_verified users only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of clinics the user belongs to' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.LookupByPhoneDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "lookupByPhone", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('login-by-phone'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login with phone, password and clinic_id (phone_verified users only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login successful' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials or unverified phone' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.LoginByPhoneDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginByPhone", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Exchange a refresh token for a new access token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'New access and refresh tokens' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired refresh token' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.RefreshTokenDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Change password using old and new password' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password changed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Old password is incorrect or user not found' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 3 } }),
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new clinic with admin user (onboarding)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Clinic and admin user created with 14-day trial' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Clinic email or admin email already exists' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many registration attempts' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.RegisterClinicDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('send-verification'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Send email verification link to the logged-in user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Verification email sent' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendVerificationEmail", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email address using the token from the verification link' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Email verified' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired token' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 3 } }),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request a password reset email. clinic_id is optional — if omitted, sends to all accounts matching the email.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reset email sent (if account exists)' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using token from the reset email' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password reset successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired token' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('send-phone-otp'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send OTP to phone number for user verification' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent to phone' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendPhoneOtp", null);
__decorate([
    (0, common_1.Post)('verify-phone'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify phone number using OTP code' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Phone verification result' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyPhone", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Get)('claim/:clinicId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get preview data for a free listing claim (pre-fills registration form)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Clinic preview data for the claim form' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Not claimable (already subscriber or not approved)' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already claimed' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getClaimPreview", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 3 } }),
    (0, common_1.Post)('claim'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Claim a free directory listing and activate full software (14-day trial)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Listing claimed, admin user created' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid token or listing not approved' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already claimed or email conflict' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.CREATED }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "claimDirectoryListing", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 3600000, limit: 5 } }),
    (0, common_1.Post)('register/send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send WhatsApp OTP to admin phone before clinic registration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent via WhatsApp' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many OTP requests' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendRegistrationOtp", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('register/verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify WhatsApp OTP and receive a short-lived verification token for registration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP verified, returns token' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyRegistrationOtp", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send OTP to phone or email for verification' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify OTP code' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP verification result' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_js_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map