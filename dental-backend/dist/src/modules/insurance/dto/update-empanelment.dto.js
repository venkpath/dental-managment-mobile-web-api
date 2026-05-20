"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEmpanelmentDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_empanelment_dto_js_1 = require("./create-empanelment.dto.js");
class UpdateEmpanelmentDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_empanelment_dto_js_1.CreateEmpanelmentDto, ['provider_id'])) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateEmpanelmentDto = UpdateEmpanelmentDto;
//# sourceMappingURL=update-empanelment.dto.js.map