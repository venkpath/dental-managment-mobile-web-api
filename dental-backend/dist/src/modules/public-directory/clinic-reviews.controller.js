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
exports.ClinicReviewsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_2 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const index_js_1 = require("../user/dto/index.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
class ListReviewsQuery {
    status;
    sort;
    page;
    limit;
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ enum: ['submitted', 'approved', 'rejected', 'pending'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['submitted', 'approved', 'rejected', 'pending']),
    __metadata("design:type", String)
], ListReviewsQuery.prototype, "status", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ enum: ['newest', 'oldest', 'highest', 'lowest'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['newest', 'oldest', 'highest', 'lowest']),
    __metadata("design:type", String)
], ListReviewsQuery.prototype, "sort", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListReviewsQuery.prototype, "page", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], ListReviewsQuery.prototype, "limit", void 0);
let ClinicReviewsController = class ClinicReviewsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listReviews(clinicId, query) {
        const { status = 'submitted', sort = 'newest', page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = { clinic_id: clinicId, approval_status: status };
        const orderBy = sort === 'oldest' ? { created_at: 'asc' }
            : sort === 'highest' ? { overall_rating: 'desc' }
                : sort === 'lowest' ? { overall_rating: 'asc' }
                    : { created_at: 'desc' };
        const [data, total] = await Promise.all([
            this.prisma.clinicDirectoryReview.findMany({
                where,
                select: {
                    id: true,
                    reviewer_name: true,
                    overall_rating: true,
                    cleanliness_rating: true,
                    staff_rating: true,
                    wait_time_rating: true,
                    value_rating: true,
                    comment: true,
                    approval_status: true,
                    source: true,
                    is_visible: true,
                    is_verified: true,
                    created_at: true,
                    token_used_at: true,
                    doctor: { select: { id: true, name: true } },
                    patient: { select: { id: true, first_name: true, last_name: true, phone: true } },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.clinicDirectoryReview.count({ where }),
        ]);
        return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
    }
    async getCounts(clinicId) {
        const [submitted, approved, rejected] = await Promise.all([
            this.prisma.clinicDirectoryReview.count({ where: { clinic_id: clinicId, approval_status: 'submitted' } }),
            this.prisma.clinicDirectoryReview.count({ where: { clinic_id: clinicId, approval_status: 'approved' } }),
            this.prisma.clinicDirectoryReview.count({ where: { clinic_id: clinicId, approval_status: 'rejected' } }),
        ]);
        return { submitted, approved, rejected };
    }
    async approveReview(clinicId, id) {
        const review = await this.prisma.clinicDirectoryReview.findUnique({
            where: { id },
            select: { id: true, clinic_id: true, approval_status: true },
        });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        if (review.clinic_id !== clinicId)
            throw new common_1.ForbiddenException('Review does not belong to this clinic');
        if (review.approval_status === 'approved')
            return { success: true, message: 'Review is already approved' };
        await this.prisma.clinicDirectoryReview.update({
            where: { id },
            data: { approval_status: 'approved', is_visible: true },
        });
        return { success: true, message: 'Review approved and is now visible on your public profile' };
    }
    async rejectReview(clinicId, id) {
        const review = await this.prisma.clinicDirectoryReview.findUnique({
            where: { id },
            select: { id: true, clinic_id: true, approval_status: true },
        });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        if (review.clinic_id !== clinicId)
            throw new common_1.ForbiddenException('Review does not belong to this clinic');
        if (review.approval_status === 'rejected')
            return { success: true, message: 'Review is already rejected' };
        await this.prisma.clinicDirectoryReview.update({
            where: { id },
            data: { approval_status: 'rejected', is_visible: false },
        });
        return { success: true, message: 'Review rejected and will not appear on your public profile' };
    }
};
exports.ClinicReviewsController = ClinicReviewsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List directory reviews for this clinic, filtered by approval status' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ListReviewsQuery]),
    __metadata("design:returntype", Promise)
], ClinicReviewsController.prototype, "listReviews", null);
__decorate([
    (0, common_1.Get)('counts'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get review counts by approval status (for dashboard badges)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClinicReviewsController.prototype, "getCounts", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a patient review — makes it visible on the public clinic profile' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClinicReviewsController.prototype, "approveReview", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a patient review — keeps it hidden from the public profile' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClinicReviewsController.prototype, "rejectReview", null);
exports.ClinicReviewsController = ClinicReviewsController = __decorate([
    (0, swagger_1.ApiTags)('Clinic Directory Reviews'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('clinic-reviews'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ClinicReviewsController);
//# sourceMappingURL=clinic-reviews.controller.js.map