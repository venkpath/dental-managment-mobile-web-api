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
var PaymentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const payment_service_js_1 = require("./payment.service.js");
let PaymentController = PaymentController_1 = class PaymentController {
    paymentService;
    logger = new common_1.Logger(PaymentController_1.name);
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async getSubscriptionStatus(clinicId) {
        try {
            return await this.paymentService.getSubscriptionStatus(clinicId);
        }
        catch (error) {
            this.logger.error(`Failed to get subscription status for clinic ${clinicId}`, error.stack);
            throw error;
        }
    }
    async getPlans() {
        return this.paymentService.getPlans();
    }
    async createSubscription(clinicId, body) {
        return this.paymentService.createSubscription({
            clinicId,
            planKey: body.planKey,
        });
    }
    async cancelSubscription(clinicId) {
        await this.paymentService.cancelSubscription(clinicId);
        return { message: 'Subscription cancelled' };
    }
    async handleWebhook(body, signature) {
        await this.paymentService.handleWebhook(body, signature);
        return { received: true };
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Get)('status'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get subscription status', description: 'Returns current plan, trial info, and subscription status' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getSubscriptionStatus", null);
__decorate([
    (0, common_1.Get)('plans'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get available plans' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a subscription', description: 'Creates a Razorpay subscription for the clinic' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel subscription' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "cancelSubscription", null);
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Razorpay webhook handler' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-razorpay-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleWebhook", null);
exports.PaymentController = PaymentController = PaymentController_1 = __decorate([
    (0, swagger_1.ApiTags)('Payment'),
    (0, common_1.Controller)('payment'),
    __metadata("design:paramtypes", [payment_service_js_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map