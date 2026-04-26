"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrescriptionModule = void 0;
const common_1 = require("@nestjs/common");
const prescription_controller_js_1 = require("./prescription.controller.js");
const prescription_service_js_1 = require("./prescription.service.js");
const prescription_pdf_service_js_1 = require("./prescription-pdf.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const automation_module_js_1 = require("../automation/automation.module.js");
let PrescriptionModule = class PrescriptionModule {
};
exports.PrescriptionModule = PrescriptionModule;
exports.PrescriptionModule = PrescriptionModule = __decorate([
    (0, common_1.Module)({
        imports: [automation_module_js_1.AutomationModule],
        controllers: [prescription_controller_js_1.PrescriptionController, prescription_controller_js_1.PrescriptionPublicController],
        providers: [prescription_service_js_1.PrescriptionService, prescription_pdf_service_js_1.PrescriptionPdfService, s3_service_js_1.S3Service],
        exports: [prescription_service_js_1.PrescriptionService],
    })
], PrescriptionModule);
//# sourceMappingURL=prescription.module.js.map