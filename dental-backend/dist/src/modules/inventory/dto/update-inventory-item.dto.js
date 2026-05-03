"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateInventoryItemDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_inventory_item_dto_js_1 = require("./create-inventory-item.dto.js");
class UpdateInventoryItemDto extends (0, swagger_1.PartialType)(create_inventory_item_dto_js_1.CreateInventoryItemDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateInventoryItemDto = UpdateInventoryItemDto;
//# sourceMappingURL=update-inventory-item.dto.js.map