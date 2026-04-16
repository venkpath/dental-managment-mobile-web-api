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
exports.UpdateMembershipEnrollmentDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const create_membership_enrollment_dto_js_1 = require("./create-membership-enrollment.dto.js");
class UpdateMembershipEnrollmentDto extends (0, swagger_2.PartialType)(create_membership_enrollment_dto_js_1.CreateMembershipEnrollmentDto) {
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: false, type: () => String, enum: ['active', 'expired', 'cancelled', 'paused'] } };
    }
}
exports.UpdateMembershipEnrollmentDto = UpdateMembershipEnrollmentDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['active', 'expired', 'cancelled', 'paused'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['active', 'expired', 'cancelled', 'paused']),
    __metadata("design:type", String)
], UpdateMembershipEnrollmentDto.prototype, "status", void 0);
//# sourceMappingURL=update-membership-enrollment.dto.js.map