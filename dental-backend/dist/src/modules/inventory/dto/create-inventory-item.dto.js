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
exports.CreateInventoryItemDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateInventoryItemDto {
    branch_id;
    name;
    category;
    quantity;
    unit;
    reorder_level;
    supplier;
    purchase_unit;
    purchase_price;
    pack_unit;
    packs_per_purchase;
    units_per_pack;
    units_in_purchase;
    cost_price;
    selling_price;
    markup_percent;
    expiry_date;
    batch_number;
    location;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, name: { required: true, type: () => String, maxLength: 255 }, category: { required: false, type: () => String, maxLength: 100 }, quantity: { required: true, type: () => Number, minimum: 0 }, unit: { required: true, type: () => String, maxLength: 50 }, reorder_level: { required: false, type: () => Number, minimum: 0 }, supplier: { required: false, type: () => String, maxLength: 255 }, purchase_unit: { required: false, type: () => String, maxLength: 50 }, purchase_price: { required: false, type: () => Number, minimum: 0 }, pack_unit: { required: false, type: () => String, maxLength: 50 }, packs_per_purchase: { required: false, type: () => Number, minimum: 1 }, units_per_pack: { required: false, type: () => Number, minimum: 1 }, units_in_purchase: { required: false, type: () => Number, minimum: 1 }, cost_price: { required: false, type: () => Number, minimum: 0 }, selling_price: { required: false, type: () => Number, minimum: 0 }, markup_percent: { required: false, type: () => Number, minimum: 0 }, expiry_date: { required: false, type: () => Date }, batch_number: { required: false, type: () => String, maxLength: 100 }, location: { required: false, type: () => String, maxLength: 100 }, notes: { required: false, type: () => String } };
    }
}
exports.CreateInventoryItemDto = CreateInventoryItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch ID', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Item name', maxLength: 255 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Item category', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current quantity', minimum: 0 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unit of measurement (e.g. pcs, ml, box)', maxLength: 50 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reorder level threshold', minimum: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "reorder_level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Supplier name', maxLength: 255 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "supplier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Purchase unit (box, bottle, pack)', maxLength: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "purchase_unit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Purchase price per purchase_unit (₹)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "purchase_price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Intermediate pack unit (strip, sachet)', maxLength: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "pack_unit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Number of pack_units per purchase_unit' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "packs_per_purchase", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Dispensing units per pack_unit (or per purchase if no pack_unit)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "units_per_pack", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Total dispensing units in one purchase (auto-calculated)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "units_in_purchase", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cost per dispensing unit (auto = purchase_price / units_in_purchase)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "cost_price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Selling price per dispensing unit (₹)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "selling_price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Markup percentage over cost price' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "markup_percent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Expiry date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateInventoryItemDto.prototype, "expiry_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Batch / lot number', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "batch_number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Storage location (shelf/cabinet)', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "notes", void 0);
//# sourceMappingURL=create-inventory-item.dto.js.map