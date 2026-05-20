"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_js_1 = require("../../database/prisma.module.js");
const auth_module_js_1 = require("../auth/auth.module.js");
const feature_module_js_1 = require("../feature/feature.module.js");
const insurance_providers_controller_js_1 = require("./controllers/insurance-providers.controller.js");
const clinic_empanelment_controller_js_1 = require("./controllers/clinic-empanelment.controller.js");
const patient_insurance_controller_js_1 = require("./controllers/patient-insurance.controller.js");
const insurance_module_controller_js_1 = require("./controllers/insurance-module.controller.js");
const insurance_providers_service_js_1 = require("./services/insurance-providers.service.js");
const clinic_empanelment_service_js_1 = require("./services/clinic-empanelment.service.js");
const patient_insurance_service_js_1 = require("./services/patient-insurance.service.js");
const insurance_file_service_js_1 = require("./services/insurance-file.service.js");
const india_strategy_js_1 = require("./strategies/india.strategy.js");
const strategy_factory_js_1 = require("./strategies/strategy.factory.js");
let InsuranceModule = class InsuranceModule {
};
exports.InsuranceModule = InsuranceModule;
exports.InsuranceModule = InsuranceModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_js_1.PrismaModule, auth_module_js_1.AuthModule, feature_module_js_1.FeatureModule],
        controllers: [
            insurance_providers_controller_js_1.InsuranceProvidersController,
            clinic_empanelment_controller_js_1.ClinicEmpanelmentController,
            patient_insurance_controller_js_1.PatientInsuranceController,
            insurance_module_controller_js_1.InsuranceModuleController,
        ],
        providers: [
            insurance_providers_service_js_1.InsuranceProvidersService,
            clinic_empanelment_service_js_1.ClinicEmpanelmentService,
            patient_insurance_service_js_1.PatientInsuranceService,
            insurance_file_service_js_1.InsuranceFileService,
            india_strategy_js_1.IndiaInsuranceStrategy,
            strategy_factory_js_1.InsuranceStrategyFactory,
        ],
        exports: [
            insurance_providers_service_js_1.InsuranceProvidersService,
            clinic_empanelment_service_js_1.ClinicEmpanelmentService,
            patient_insurance_service_js_1.PatientInsuranceService,
            insurance_file_service_js_1.InsuranceFileService,
            strategy_factory_js_1.InsuranceStrategyFactory,
        ],
    })
], InsuranceModule);
//# sourceMappingURL=insurance.module.js.map