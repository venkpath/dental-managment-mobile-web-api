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
exports.UpdateSupportTicketDto = exports.CreateSupportTicketDto = exports.TICKET_STATUSES = exports.TICKET_CATEGORIES = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
exports.TICKET_CATEGORIES = [
    'bug',
    'feature_request',
    'billing',
    'account',
    'general',
];
exports.TICKET_STATUSES = [
    'open',
    'in_progress',
    'resolved',
    'closed',
];
class CreateSupportTicketDto {
    category;
    subject;
    message;
}
exports.CreateSupportTicketDto = CreateSupportTicketDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.TICKET_CATEGORIES }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.TICKET_CATEGORIES),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "message", void 0);
class UpdateSupportTicketDto {
    status;
    admin_notes;
}
exports.UpdateSupportTicketDto = UpdateSupportTicketDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: exports.TICKET_STATUSES }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.TICKET_STATUSES),
    __metadata("design:type", String)
], UpdateSupportTicketDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdateSupportTicketDto.prototype, "admin_notes", void 0);
//# sourceMappingURL=index.js.map