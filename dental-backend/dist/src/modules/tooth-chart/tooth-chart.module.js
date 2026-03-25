"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToothChartModule = void 0;
const common_1 = require("@nestjs/common");
const tooth_chart_controller_js_1 = require("./tooth-chart.controller.js");
const tooth_chart_service_js_1 = require("./tooth-chart.service.js");
let ToothChartModule = class ToothChartModule {
};
exports.ToothChartModule = ToothChartModule;
exports.ToothChartModule = ToothChartModule = __decorate([
    (0, common_1.Module)({
        controllers: [tooth_chart_controller_js_1.ToothChartController],
        providers: [tooth_chart_service_js_1.ToothChartService],
        exports: [tooth_chart_service_js_1.ToothChartService],
    })
], ToothChartModule);
//# sourceMappingURL=tooth-chart.module.js.map