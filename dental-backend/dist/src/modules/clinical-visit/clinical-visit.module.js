"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalVisitModule = void 0;
const common_1 = require("@nestjs/common");
const clinical_visit_controller_js_1 = require("./clinical-visit.controller.js");
const clinical_visit_service_js_1 = require("./clinical-visit.service.js");
const plan_limit_module_js_1 = require("../../common/services/plan-limit.module.js");
let ClinicalVisitModule = class ClinicalVisitModule {
};
exports.ClinicalVisitModule = ClinicalVisitModule;
exports.ClinicalVisitModule = ClinicalVisitModule = __decorate([
    (0, common_1.Module)({
        imports: [plan_limit_module_js_1.PlanLimitModule],
        controllers: [clinical_visit_controller_js_1.ClinicalVisitController],
        providers: [clinical_visit_service_js_1.ClinicalVisitService],
        exports: [clinical_visit_service_js_1.ClinicalVisitService],
    })
], ClinicalVisitModule);
//# sourceMappingURL=clinical-visit.module.js.map