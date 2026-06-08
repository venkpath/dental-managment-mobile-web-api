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
exports.GoogleReviewsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const google_reviews_service_js_1 = require("./google-reviews.service.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const select_location_dto_js_1 = require("./dto/select-location.dto.js");
const update_settings_dto_js_1 = require("./dto/update-settings.dto.js");
const list_reviews_query_dto_js_1 = require("./dto/list-reviews-query.dto.js");
const approve_reply_dto_js_1 = require("./dto/approve-reply.dto.js");
let GoogleReviewsController = class GoogleReviewsController {
    googleReviews;
    config;
    constructor(googleReviews, config) {
        this.googleReviews = googleReviews;
        this.config = config;
    }
    getAuthUrl(req) {
        return this.googleReviews.buildConnectUrl(req.user.clinicId);
    }
    async oauthCallback(code, state, error, res) {
        const frontendUrl = this.config.get('app.frontendUrl') || 'http://localhost:3001';
        const redirectBase = `${frontendUrl}/settings/integrations/google-reviews`;
        if (error) {
            return res.redirect(`${redirectBase}?status=error&message=${encodeURIComponent(error)}`);
        }
        if (!code || !state) {
            return res.redirect(`${redirectBase}?status=error&message=missing_params`);
        }
        try {
            const result = await this.googleReviews.handleOAuthCallback({ code, state });
            const params = new URLSearchParams({
                status: 'connected',
                account_name: result.account_name,
                location_count: String(result.locations.length),
            });
            return res.redirect(`${redirectBase}?${params.toString()}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'unknown error';
            return res.redirect(`${redirectBase}?status=error&message=${encodeURIComponent(message)}`);
        }
    }
    getConnection(req) {
        return this.googleReviews.getConnectionStatus(req.user.clinicId);
    }
    listLocations(req) {
        return this.googleReviews.listLocations(req.user.clinicId);
    }
    selectLocation(req, dto) {
        return this.googleReviews.selectLocation(req.user.clinicId, dto.location_id, dto.location_name);
    }
    disconnect(req) {
        return this.googleReviews.disconnect(req.user.clinicId);
    }
    getSettings(req) {
        return this.googleReviews.getSettings(req.user.clinicId);
    }
    updateSettings(req, dto) {
        return this.googleReviews.updateSettings(req.user.clinicId, dto);
    }
    syncNow(req) {
        return this.googleReviews.syncClinic(req.user.clinicId);
    }
    listReviews(req, query) {
        return this.googleReviews.listReviews(req.user.clinicId, query);
    }
    getReview(req, id) {
        return this.googleReviews.getReview(req.user.clinicId, id);
    }
    regenerate(req, id) {
        return this.googleReviews.regenerateDraft(req.user.clinicId, id, req.user.userId);
    }
    approve(req, id, dto) {
        return this.googleReviews.approveAndPost({
            clinicId: req.user.clinicId,
            reviewId: id,
            userId: req.user.userId,
            overrideReply: dto.reply,
        });
    }
};
exports.GoogleReviewsController = GoogleReviewsController;
__decorate([
    (0, common_1.Get)('auth-url'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get the Google OAuth consent URL for the clinic admin to connect their Google Business Profile' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.Get)('oauth/callback'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'OAuth callback handler (Google redirects here after consent)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], GoogleReviewsController.prototype, "oauthCallback", null);
__decorate([
    (0, common_1.Get)('connection'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get current Google Business Profile connection status for the clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "getConnection", null);
__decorate([
    (0, common_1.Get)('locations'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List Google Business locations the connected account can manage (for picking which one to monitor)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "listLocations", null);
__decorate([
    (0, common_1.Post)('select-location'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Pick which Google Business location this clinic should manage reviews for' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, select_location_dto_js_1.SelectLocationDto]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "selectLocation", null);
__decorate([
    (0, common_1.Delete)('connection'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Disconnect this clinic from Google Business Profile (revokes refresh token)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get Google review auto-reply settings for the clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update Google review auto-reply settings (tone, threshold, instructions)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_settings_dto_js_1.UpdateGoogleReviewSettingsDto]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger a Google review sync for this clinic (also runs hourly via cron)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "syncNow", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT),
    (0, swagger_1.ApiOperation)({ summary: 'List synced Google reviews with optional status / rating filters' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_reviews_query_dto_js_1.ListReviewsQueryDto]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "listReviews", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST, create_user_dto_js_1.UserRole.CONSULTANT),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single Google review with its AI draft reply' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "getReview", null);
__decorate([
    (0, common_1.Post)(':id/regenerate'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Regenerate the AI draft reply for a review (uses one AI quota slot)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "regenerate", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Approve and post the AI draft reply (optionally with edits) to Google' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, approve_reply_dto_js_1.ApproveReplyDto]),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "approve", null);
exports.GoogleReviewsController = GoogleReviewsController = __decorate([
    (0, swagger_1.ApiTags)('Google Reviews'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('google-reviews'),
    __metadata("design:paramtypes", [google_reviews_service_js_1.GoogleReviewsService,
        config_1.ConfigService])
], GoogleReviewsController);
//# sourceMappingURL=google-reviews.controller.js.map