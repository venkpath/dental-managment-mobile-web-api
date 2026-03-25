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
exports.DataExportController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const data_export_service_js_1 = require("./data-export.service.js");
let DataExportController = class DataExportController {
    dataExportService;
    constructor(dataExportService) {
        this.dataExportService = dataExportService;
    }
    async exportClinicData(user, res) {
        const data = await this.dataExportService.exportClinicData(user.clinic_id);
        const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));
        res.set({
            'Content-Disposition': `attachment; filename="clinic_data_export_${new Date().toISOString().slice(0, 10)}.json"`,
        });
        return new common_1.StreamableFile(jsonBuffer);
    }
};
exports.DataExportController = DataExportController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export all clinic data', description: 'Exports all clinic data as JSON for compliance/portability' }),
    (0, common_1.Header)('Content-Type', 'application/json'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DataExportController.prototype, "exportClinicData", null);
exports.DataExportController = DataExportController = __decorate([
    (0, swagger_1.ApiTags)('Data Export'),
    (0, common_1.Controller)('data-export'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [data_export_service_js_1.DataExportService])
], DataExportController);
//# sourceMappingURL=data-export.controller.js.map