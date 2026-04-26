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
exports.MarkOverageChargePaidDto = exports.DecideAiQuotaApprovalRequestDto = exports.CreateAiQuotaApprovalRequestDto = exports.UpdateAiSettingsDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateAiSettingsDto {
    overage_enabled;
    static _OPENAPI_METADATA_FACTORY() {
        return { overage_enabled: { required: true, type: () => Boolean } };
    }
}
exports.UpdateAiSettingsDto = UpdateAiSettingsDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAiSettingsDto.prototype, "overage_enabled", void 0);
class CreateAiQuotaApprovalRequestDto {
    requested_amount;
    reason;
    static _OPENAPI_METADATA_FACTORY() {
        return { requested_amount: { required: true, type: () => Number, minimum: 1 }, reason: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.CreateAiQuotaApprovalRequestDto = CreateAiQuotaApprovalRequestDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateAiQuotaApprovalRequestDto.prototype, "requested_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateAiQuotaApprovalRequestDto.prototype, "reason", void 0);
class DecideAiQuotaApprovalRequestDto {
    status;
    approved_amount;
    note;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: true, type: () => Object }, approved_amount: { required: false, type: () => Number, minimum: 0 }, note: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.DecideAiQuotaApprovalRequestDto = DecideAiQuotaApprovalRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DecideAiQuotaApprovalRequestDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], DecideAiQuotaApprovalRequestDto.prototype, "approved_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], DecideAiQuotaApprovalRequestDto.prototype, "note", void 0);
class MarkOverageChargePaidDto {
    payment_reference;
    note;
    static _OPENAPI_METADATA_FACTORY() {
        return { payment_reference: { required: false, type: () => String, maxLength: 200 }, note: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.MarkOverageChargePaidDto = MarkOverageChargePaidDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], MarkOverageChargePaidDto.prototype, "payment_reference", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], MarkOverageChargePaidDto.prototype, "note", void 0);
//# sourceMappingURL=ai-quota.dto.js.map