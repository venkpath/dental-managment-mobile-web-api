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
exports.SelectLocationDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class SelectLocationDto {
    location_id;
    location_name;
    static _OPENAPI_METADATA_FACTORY() {
        return { location_id: { required: true, type: () => String, maxLength: 100 }, location_name: { required: true, type: () => String, maxLength: 255 } };
    }
}
exports.SelectLocationDto = SelectLocationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Google location id (numeric, no "locations/" prefix)', example: '987654321' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], SelectLocationDto.prototype, "location_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Human-readable location title', example: 'Smart Dental Desk — Anna Nagar' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], SelectLocationDto.prototype, "location_name", void 0);
//# sourceMappingURL=select-location.dto.js.map