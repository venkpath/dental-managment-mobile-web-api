"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTOMATION_RULE_TYPES = exports.UpsertAutomationRuleDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpsertAutomationRuleDto {
    is_enabled;
    channel;
    template_id;
    config;
    static _OPENAPI_METADATA_FACTORY() {
        return { is_enabled: { required: false, type: () => Boolean }, channel: { required: false, type: () => String }, template_id: { required: false, type: () => String, format: "uuid" }, config: { required: false, type: () => Object } };
    }
}
exports.UpsertAutomationRuleDto = UpsertAutomationRuleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Enable or disable this rule' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertAutomationRuleDto.prototype, "is_enabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['email', 'sms', 'whatsapp', 'preferred'], description: 'Channel to use' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['email', 'sms', 'whatsapp', 'preferred']),
    __metadata("design:type", String)
], UpsertAutomationRuleDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template to use for this automation' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpsertAutomationRuleDto.prototype, "template_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Rule-specific config (e.g., { delay_hours: 3, dormancy_months: 6 })',
        example: { delay_hours: 3 },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpsertAutomationRuleDto.prototype, "config", void 0);
exports.AUTOMATION_RULE_TYPES = [
    'birthday_greeting',
    'festival_greeting',
    'post_treatment_care',
    'no_show_followup',
    'dormant_reactivation',
    'treatment_plan_reminder',
    'payment_reminder',
    'feedback_collection',
    'appointment_reminder_patient',
    'anniversary_greeting',
    'prescription_refill',
    'appointment_confirmation',
    'appointment_cancellation',
    'appointment_rescheduled',
];
//# sourceMappingURL=upsert-automation-rule.dto.js.map