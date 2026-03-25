"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportModule = void 0;
const common_1 = require("@nestjs/common");
const data_export_controller_js_1 = require("./data-export.controller.js");
const data_export_service_js_1 = require("./data-export.service.js");
let DataExportModule = class DataExportModule {
};
exports.DataExportModule = DataExportModule;
exports.DataExportModule = DataExportModule = __decorate([
    (0, common_1.Module)({
        controllers: [data_export_controller_js_1.DataExportController],
        providers: [data_export_service_js_1.DataExportService],
    })
], DataExportModule);
//# sourceMappingURL=data-export.module.js.map