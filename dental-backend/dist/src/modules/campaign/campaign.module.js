"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignModule = void 0;
const common_1 = require("@nestjs/common");
const campaign_controller_js_1 = require("./campaign.controller.js");
const campaign_service_js_1 = require("./campaign.service.js");
const campaign_cron_js_1 = require("./campaign.cron.js");
let CampaignModule = class CampaignModule {
};
exports.CampaignModule = CampaignModule;
exports.CampaignModule = CampaignModule = __decorate([
    (0, common_1.Module)({
        controllers: [campaign_controller_js_1.CampaignController],
        providers: [campaign_service_js_1.CampaignService, campaign_cron_js_1.CampaignCronService],
        exports: [campaign_service_js_1.CampaignService],
    })
], CampaignModule);
//# sourceMappingURL=campaign.module.js.map