"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureModule = void 0;
const common_1 = require("@nestjs/common");
const feature_controller_js_1 = require("./feature.controller.js");
const feature_service_js_1 = require("./feature.service.js");
const clinic_feature_service_js_1 = require("./clinic-feature.service.js");
let FeatureModule = class FeatureModule {
};
exports.FeatureModule = FeatureModule;
exports.FeatureModule = FeatureModule = __decorate([
    (0, common_1.Module)({
        controllers: [feature_controller_js_1.FeatureController],
        providers: [feature_service_js_1.FeatureService, clinic_feature_service_js_1.ClinicFeatureService],
        exports: [feature_service_js_1.FeatureService, clinic_feature_service_js_1.ClinicFeatureService],
    })
], FeatureModule);
//# sourceMappingURL=feature.module.js.map