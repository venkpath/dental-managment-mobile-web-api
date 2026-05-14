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
exports.TutorialController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const tutorial_service_js_1 = require("./tutorial.service.js");
const index_js_1 = require("./dto/index.js");
let TutorialController = class TutorialController {
    service;
    constructor(service) {
        this.service = service;
    }
    async list(user) {
        return this.service.listForUser(user.userId, user.role);
    }
    async getStreamUrl(id, user) {
        return this.service.getStreamUrl(id, user.userId, user.role);
    }
    async updateProgress(id, user, dto) {
        return this.service.updateProgress(id, user.userId, user.role, dto);
    }
};
exports.TutorialController = TutorialController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List tutorials visible to the current user (role-filtered)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TutorialController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id/stream-url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a short-lived signed video URL for a tutorial' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TutorialController.prototype, "getStreamUrl", null);
__decorate([
    (0, common_1.Post)(':id/progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Update watch progress / mark completed' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, index_js_1.UpdateProgressDto]),
    __metadata("design:returntype", Promise)
], TutorialController.prototype, "updateProgress", null);
exports.TutorialController = TutorialController = __decorate([
    (0, swagger_1.ApiTags)('Tutorials'),
    (0, common_1.Controller)('tutorials'),
    __metadata("design:paramtypes", [tutorial_service_js_1.TutorialService])
], TutorialController);
//# sourceMappingURL=tutorial.controller.js.map