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
exports.SuperAdminTutorialController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const tutorial_service_js_1 = require("./tutorial.service.js");
const index_js_1 = require("./dto/index.js");
let SuperAdminTutorialController = class SuperAdminTutorialController {
    service;
    constructor(service) {
        this.service = service;
    }
    async list() {
        return this.service.listAllForAdmin();
    }
    async create(dto) {
        return this.service.createTutorial(dto);
    }
    async update(id, dto) {
        return this.service.updateTutorial(id, dto);
    }
    async remove(id) {
        return this.service.deleteTutorial(id);
    }
};
exports.SuperAdminTutorialController = SuperAdminTutorialController;
__decorate([
    (0, common_1.Get)(),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all tutorials (unfiltered, includes unpublished)' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminTutorialController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Register a tutorial after manually uploading the video to S3' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.CreateTutorialDto]),
    __metadata("design:returntype", Promise)
], SuperAdminTutorialController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update tutorial metadata' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.UpdateTutorialDto]),
    __metadata("design:returntype", Promise)
], SuperAdminTutorialController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete tutorial (S3 object not removed; do that manually if desired)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminTutorialController.prototype, "remove", null);
exports.SuperAdminTutorialController = SuperAdminTutorialController = __decorate([
    (0, swagger_1.ApiTags)('Super Admin · Tutorials'),
    (0, common_1.Controller)('super-admins/tutorials'),
    __metadata("design:paramtypes", [tutorial_service_js_1.TutorialService])
], SuperAdminTutorialController);
//# sourceMappingURL=super-admin-tutorial.controller.js.map