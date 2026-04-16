"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanLimitModule = void 0;
const common_1 = require("@nestjs/common");
const plan_limit_service_js_1 = require("./plan-limit.service.js");
let PlanLimitModule = class PlanLimitModule {
};
exports.PlanLimitModule = PlanLimitModule;
exports.PlanLimitModule = PlanLimitModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [plan_limit_service_js_1.PlanLimitService],
        exports: [plan_limit_service_js_1.PlanLimitService],
    })
], PlanLimitModule);
//# sourceMappingURL=plan-limit.module.js.map