"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const automation_controller_js_1 = require("./automation.controller.js");
const automation_service_js_1 = require("./automation.service.js");
const automation_cron_js_1 = require("./automation.cron.js");
const clinic_events_module_js_1 = require("../clinic-events/clinic-events.module.js");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
let AutomationModule = class AutomationModule {
};
exports.AutomationModule = AutomationModule;
exports.AutomationModule = AutomationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            clinic_events_module_js_1.ClinicEventsModule,
            bullmq_1.BullModule.registerQueue({ name: queue_names_js_1.QUEUE_NAMES.APPOINTMENT_REMINDER }),
        ],
        controllers: [automation_controller_js_1.AutomationController],
        providers: [automation_service_js_1.AutomationService, automation_cron_js_1.AutomationCronService],
        exports: [automation_service_js_1.AutomationService],
    })
], AutomationModule);
//# sourceMappingURL=automation.module.js.map