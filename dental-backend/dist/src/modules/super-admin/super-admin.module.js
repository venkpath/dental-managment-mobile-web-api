"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminModule = void 0;
const common_1 = require("@nestjs/common");
const super_admin_controller_js_1 = require("./super-admin.controller.js");
const super_admin_service_js_1 = require("./super-admin.service.js");
const super_admin_auth_service_js_1 = require("./super-admin-auth.service.js");
const super_admin_whatsapp_service_js_1 = require("./super-admin-whatsapp.service.js");
const platform_template_controller_js_1 = require("./platform-template.controller.js");
const platform_template_service_js_1 = require("./platform-template.service.js");
const inactivity_cron_js_1 = require("./inactivity.cron.js");
const auth_module_js_1 = require("../auth/auth.module.js");
const clinic_module_js_1 = require("../clinic/clinic.module.js");
const automation_module_js_1 = require("../automation/automation.module.js");
const branch_module_js_1 = require("../branch/branch.module.js");
const reports_module_js_1 = require("../reports/reports.module.js");
const feature_module_js_1 = require("../feature/feature.module.js");
let SuperAdminModule = class SuperAdminModule {
};
exports.SuperAdminModule = SuperAdminModule;
exports.SuperAdminModule = SuperAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_js_1.AuthModule, clinic_module_js_1.ClinicModule, automation_module_js_1.AutomationModule, branch_module_js_1.BranchModule, reports_module_js_1.ReportsModule, feature_module_js_1.FeatureModule],
        controllers: [super_admin_controller_js_1.SuperAdminController, platform_template_controller_js_1.PlatformTemplateController],
        providers: [super_admin_service_js_1.SuperAdminService, super_admin_auth_service_js_1.SuperAdminAuthService, super_admin_whatsapp_service_js_1.SuperAdminWhatsAppService, platform_template_service_js_1.PlatformTemplateService, inactivity_cron_js_1.InactivityCronService],
        exports: [super_admin_service_js_1.SuperAdminService],
    })
], SuperAdminModule);
//# sourceMappingURL=super-admin.module.js.map