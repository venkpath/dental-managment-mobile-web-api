"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicEventsModule = void 0;
const common_1 = require("@nestjs/common");
const clinic_events_controller_js_1 = require("./clinic-events.controller.js");
const clinic_events_service_js_1 = require("./clinic-events.service.js");
let ClinicEventsModule = class ClinicEventsModule {
};
exports.ClinicEventsModule = ClinicEventsModule;
exports.ClinicEventsModule = ClinicEventsModule = __decorate([
    (0, common_1.Module)({
        controllers: [clinic_events_controller_js_1.ClinicEventsController],
        providers: [clinic_events_service_js_1.ClinicEventsService],
        exports: [clinic_events_service_js_1.ClinicEventsService],
    })
], ClinicEventsModule);
//# sourceMappingURL=clinic-events.module.js.map