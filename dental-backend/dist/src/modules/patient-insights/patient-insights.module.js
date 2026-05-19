"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientInsightsModule = void 0;
const common_1 = require("@nestjs/common");
const patient_insights_controller_js_1 = require("./patient-insights.controller.js");
const patient_insights_service_js_1 = require("./patient-insights.service.js");
let PatientInsightsModule = class PatientInsightsModule {
};
exports.PatientInsightsModule = PatientInsightsModule;
exports.PatientInsightsModule = PatientInsightsModule = __decorate([
    (0, common_1.Module)({
        controllers: [patient_insights_controller_js_1.PatientInsightsController],
        providers: [patient_insights_service_js_1.PatientInsightsService],
        exports: [patient_insights_service_js_1.PatientInsightsService],
    })
], PatientInsightsModule);
//# sourceMappingURL=patient-insights.module.js.map