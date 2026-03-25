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
exports.CreateRecurringAppointmentDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateRecurringAppointmentDto {
    branch_id;
    patient_id;
    dentist_id;
    start_date;
    start_time;
    end_time;
    interval;
    occurrences;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, dentist_id: { required: true, type: () => String, format: "uuid" }, start_date: { required: true, type: () => String }, start_time: { required: true, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" }, end_time: { required: true, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" }, interval: { required: true, type: () => String, enum: ['weekly', 'biweekly', 'monthly'] }, occurrences: { required: true, type: () => Number, minimum: 2, maximum: 12 }, notes: { required: false, type: () => String } };
    }
}
exports.CreateRecurringAppointmentDto = CreateRecurringAppointmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-03-15', description: 'First appointment date (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '09:00', description: 'Start time in HH:mm format' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start_time must be in HH:mm format' }),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "start_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '09:30', description: 'End time in HH:mm format' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end_time must be in HH:mm format' }),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "end_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'weekly', description: 'Recurrence interval', enum: ['weekly', 'biweekly', 'monthly'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['weekly', 'biweekly', 'monthly']),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "interval", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4, description: 'Number of occurrences (2–12)', minimum: 2, maximum: 12 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreateRecurringAppointmentDto.prototype, "occurrences", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Follow-up cleaning series' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRecurringAppointmentDto.prototype, "notes", void 0);
//# sourceMappingURL=create-recurring-appointment.dto.js.map