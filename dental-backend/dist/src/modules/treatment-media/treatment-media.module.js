"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreatmentMediaModule = void 0;
const common_1 = require("@nestjs/common");
const treatment_media_service_js_1 = require("./treatment-media.service.js");
const treatment_media_controller_js_1 = require("./treatment-media.controller.js");
const auth_module_js_1 = require("../auth/auth.module.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
let TreatmentMediaModule = class TreatmentMediaModule {
};
exports.TreatmentMediaModule = TreatmentMediaModule;
exports.TreatmentMediaModule = TreatmentMediaModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_js_1.AuthModule],
        controllers: [treatment_media_controller_js_1.TreatmentMediaController],
        providers: [treatment_media_service_js_1.TreatmentMediaService, s3_service_js_1.S3Service],
        exports: [treatment_media_service_js_1.TreatmentMediaService],
    })
], TreatmentMediaModule);
//# sourceMappingURL=treatment-media.module.js.map