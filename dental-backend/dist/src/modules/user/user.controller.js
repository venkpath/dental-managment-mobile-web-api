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
exports.UserController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const user_service_js_1 = require("./user.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async create(clinicId, dto) {
        return this.userService.create(clinicId, dto);
    }
    async findAll(clinicId, role, search, branchId) {
        return this.userService.findAll(clinicId, role, search, branchId);
    }
    async findOne(clinicId, id) {
        return this.userService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.userService.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.userService.remove(clinicId, id);
    }
    async uploadSignature(clinicId, id, file) {
        return this.userService.uploadSignature(clinicId, id, file);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user in the current clinic' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'User created successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Branch not found in this clinic' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Email already exists in clinic' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List users in the current clinic' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of users' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a user by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'User found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'User not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a user' }),
    (0, swagger_1.ApiOkResponse)({ description: 'User updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'User not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a user from the clinic' }),
    (0, swagger_1.ApiNoContentResponse)({ description: 'User deleted successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'User not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/signature'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a signature image for the user (printed on prescription PDFs)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOkResponse)({ description: 'Signature uploaded' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 1 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "uploadSignature", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_service_js_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map