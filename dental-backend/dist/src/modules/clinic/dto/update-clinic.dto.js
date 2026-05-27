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
exports.UpdateClinicDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const create_clinic_dto_js_1 = require("./create-clinic.dto.js");
function IsCurrentYearOrBefore(options) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isCurrentYearOrBefore',
            target: object.constructor,
            propertyName,
            options: { message: `${propertyName} must not exceed the current year`, ...options },
            validator: {
                validate(value) {
                    if (value === null || value === undefined)
                        return true;
                    return typeof value === 'number' && value <= new Date().getFullYear();
                },
            },
        });
    };
}
class UpdateClinicDto extends (0, swagger_1.PartialType)(create_clinic_dto_js_1.CreateClinicDto) {
    rooms_enabled;
    clinic_description;
    specialties;
    working_hours_label;
    latitude;
    longitude;
    website_url;
    google_maps_url;
    established_year;
    languages_spoken;
    directory_treatments;
    gallery_images;
    static _OPENAPI_METADATA_FACTORY() {
        return { rooms_enabled: { required: false, type: () => Boolean }, clinic_description: { required: false, type: () => String, maxLength: 800 }, specialties: { required: false, type: () => String, maxLength: 500 }, working_hours_label: { required: false, type: () => String, maxLength: 200 }, latitude: { required: false, type: () => Number, nullable: true }, longitude: { required: false, type: () => Number, nullable: true }, website_url: { required: false, type: () => String, maxLength: 500 }, google_maps_url: { required: false, type: () => String, maxLength: 500 }, established_year: { required: false, type: () => Number, nullable: true, minimum: 1900 }, languages_spoken: { required: false, type: () => String, maxLength: 300 }, directory_treatments: { required: false, type: () => String, maxLength: 1000 }, gallery_images: { required: false, type: () => String, format: "json" } };
    }
}
exports.UpdateClinicDto = UpdateClinicDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Enable the Room Board feature for this clinic' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateClinicDto.prototype, "rooms_enabled", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Public clinic description shown in the directory', maxLength: 800 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(800),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "clinic_description", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Comma-separated specialties (e.g. "Orthodontics,Implantology")', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "specialties", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Human-readable working hours label', maxLength: 200 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "working_hours_label", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Latitude coordinate for geo search', example: 12.9716 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], UpdateClinicDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Longitude coordinate for geo search', example: 77.5946 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], UpdateClinicDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Clinic public website URL', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "website_url", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Google Maps URL for the clinic location', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "google_maps_url", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Year the clinic was established', example: 2014 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    IsCurrentYearOrBefore(),
    __metadata("design:type", Object)
], UpdateClinicDto.prototype, "established_year", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Languages spoken at clinic level e.g. "English, Hindi, Kannada"', maxLength: 300 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "languages_spoken", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Comma-separated treatment offerings for the directory e.g. "Dental Implants,Root Canal"', maxLength: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "directory_treatments", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'JSON-serialised array of clinic gallery photo URLs', example: '["https://example.com/a.jpg"]' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsJSON)(),
    __metadata("design:type", String)
], UpdateClinicDto.prototype, "gallery_images", void 0);
//# sourceMappingURL=update-clinic.dto.js.map