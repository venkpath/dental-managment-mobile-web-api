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
exports.CreateReimbursementDto = exports.ReimbursementAllocationDto = exports.RecordClaimPaymentDto = exports.UpdateClaimStatusDto = exports.SubmitClaimDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SubmitClaimDto {
    submission_method;
    submission_ref;
    claim_number;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { submission_method: { required: true, type: () => String }, submission_ref: { required: false, type: () => String }, claim_number: { required: false, type: () => String }, notes: { required: false, type: () => String } };
    }
}
exports.SubmitClaimDto = SubmitClaimDto;
__decorate([
    (0, class_validator_1.IsEnum)(['PORTAL', 'EMAIL', 'PHYSICAL', 'COURIER', 'EDI_837']),
    __metadata("design:type", String)
], SubmitClaimDto.prototype, "submission_method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitClaimDto.prototype, "submission_ref", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitClaimDto.prototype, "claim_number", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitClaimDto.prototype, "notes", void 0);
class UpdateClaimStatusDto {
    status;
    claim_number;
    approved_amount;
    patient_portion;
    disallowed_amount;
    rejection_reason;
    query_text;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: true, type: () => String }, claim_number: { required: false, type: () => String }, approved_amount: { required: false, type: () => Number, minimum: 0 }, patient_portion: { required: false, type: () => Number, minimum: 0 }, disallowed_amount: { required: false, type: () => Number, minimum: 0 }, rejection_reason: { required: false, type: () => String }, query_text: { required: false, type: () => String }, notes: { required: false, type: () => String } };
    }
}
exports.UpdateClaimStatusDto = UpdateClaimStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(['SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED']),
    __metadata("design:type", String)
], UpdateClaimStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClaimStatusDto.prototype, "claim_number", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateClaimStatusDto.prototype, "approved_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateClaimStatusDto.prototype, "patient_portion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateClaimStatusDto.prototype, "disallowed_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClaimStatusDto.prototype, "rejection_reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClaimStatusDto.prototype, "query_text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClaimStatusDto.prototype, "notes", void 0);
class RecordClaimPaymentDto {
    paid_amount;
    paid_at;
    bank_utr_ref;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { paid_amount: { required: true, type: () => Number, minimum: 0 }, paid_at: { required: false, type: () => String }, bank_utr_ref: { required: false, type: () => String }, notes: { required: false, type: () => String } };
    }
}
exports.RecordClaimPaymentDto = RecordClaimPaymentDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], RecordClaimPaymentDto.prototype, "paid_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RecordClaimPaymentDto.prototype, "paid_at", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordClaimPaymentDto.prototype, "bank_utr_ref", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordClaimPaymentDto.prototype, "notes", void 0);
class ReimbursementAllocationDto {
    claim_id;
    allocated_amount;
    disallowed_amount;
    disallowance_reason;
    action_taken;
    static _OPENAPI_METADATA_FACTORY() {
        return { claim_id: { required: true, type: () => String }, allocated_amount: { required: true, type: () => Number, minimum: 0 }, disallowed_amount: { required: false, type: () => Number, minimum: 0 }, disallowance_reason: { required: false, type: () => String }, action_taken: { required: false, type: () => String } };
    }
}
exports.ReimbursementAllocationDto = ReimbursementAllocationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReimbursementAllocationDto.prototype, "claim_id", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ReimbursementAllocationDto.prototype, "allocated_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ReimbursementAllocationDto.prototype, "disallowed_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReimbursementAllocationDto.prototype, "disallowance_reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['WRITE_OFF', 'REBILL_PATIENT', 'NONE']),
    __metadata("design:type", String)
], ReimbursementAllocationDto.prototype, "action_taken", void 0);
class CreateReimbursementDto {
    received_at;
    amount_received;
    tds_deducted;
    bank_utr_ref;
    currency;
    notes;
    allocations;
    static _OPENAPI_METADATA_FACTORY() {
        return { received_at: { required: true, type: () => String }, amount_received: { required: true, type: () => Number, minimum: 0 }, tds_deducted: { required: false, type: () => Number, minimum: 0 }, bank_utr_ref: { required: false, type: () => String }, currency: { required: false, type: () => String }, notes: { required: false, type: () => String }, allocations: { required: true, type: () => [require("./create-claim.dto").ReimbursementAllocationDto] } };
    }
}
exports.CreateReimbursementDto = CreateReimbursementDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReimbursementDto.prototype, "received_at", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReimbursementDto.prototype, "amount_received", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReimbursementDto.prototype, "tds_deducted", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReimbursementDto.prototype, "bank_utr_ref", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReimbursementDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReimbursementDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ReimbursementAllocationDto),
    __metadata("design:type", Array)
], CreateReimbursementDto.prototype, "allocations", void 0);
//# sourceMappingURL=create-claim.dto.js.map