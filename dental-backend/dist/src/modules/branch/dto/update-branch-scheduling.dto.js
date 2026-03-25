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
exports.UpdateBranchSchedulingDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateBranchSchedulingDto {
    working_start_time;
    working_end_time;
    lunch_start_time;
    lunch_end_time;
    slot_duration;
    default_appt_duration;
    buffer_minutes;
    advance_booking_days;
    working_days;
    static _OPENAPI_METADATA_FACTORY() {
        return { working_start_time: { required: false, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" }, working_end_time: { required: false, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" }, lunch_start_time: { required: false, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" }, lunch_end_time: { required: false, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" }, slot_duration: { required: false, type: () => Number, enum: [15, 20, 30, 45, 60] }, default_appt_duration: { required: false, type: () => Number, minimum: 10, maximum: 240 }, buffer_minutes: { required: false, type: () => Number, minimum: 0, maximum: 60 }, advance_booking_days: { required: false, type: () => Number, minimum: 0, maximum: 365 }, working_days: { required: false, type: () => String, pattern: "/^[1-7](,[1-7])*$/" } };
    }
}
exports.UpdateBranchSchedulingDto = UpdateBranchSchedulingDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '09:00', description: 'Branch opening time (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'working_start_time must be HH:mm format' }),
    __metadata("design:type", String)
], UpdateBranchSchedulingDto.prototype, "working_start_time", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '18:00', description: 'Branch closing time (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'working_end_time must be HH:mm format' }),
    __metadata("design:type", String)
], UpdateBranchSchedulingDto.prototype, "working_end_time", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '13:00', description: 'Lunch break start (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'lunch_start_time must be HH:mm format' }),
    __metadata("design:type", String)
], UpdateBranchSchedulingDto.prototype, "lunch_start_time", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '14:00', description: 'Lunch break end (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'lunch_end_time must be HH:mm format' }),
    __metadata("design:type", String)
], UpdateBranchSchedulingDto.prototype, "lunch_end_time", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 15, description: 'Slot duration in minutes (15, 20, 30, 45, 60)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsIn)([15, 20, 30, 45, 60], { message: 'slot_duration must be one of: 15, 20, 30, 45, 60' }),
    __metadata("design:type", Number)
], UpdateBranchSchedulingDto.prototype, "slot_duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30, description: 'Default appointment duration in minutes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(10),
    (0, class_validator_1.Max)(240),
    __metadata("design:type", Number)
], UpdateBranchSchedulingDto.prototype, "default_appt_duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5, description: 'Buffer minutes between appointments' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], UpdateBranchSchedulingDto.prototype, "buffer_minutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30, description: 'How many days ahead appointments can be booked (0 = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], UpdateBranchSchedulingDto.prototype, "advance_booking_days", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1,2,3,4,5,6', description: 'Working days (1=Mon..7=Sun), comma-separated' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[1-7](,[1-7])*$/, { message: 'working_days must be comma-separated day numbers (1=Mon..7=Sun)' }),
    __metadata("design:type", String)
], UpdateBranchSchedulingDto.prototype, "working_days", void 0);
//# sourceMappingURL=update-branch-scheduling.dto.js.map