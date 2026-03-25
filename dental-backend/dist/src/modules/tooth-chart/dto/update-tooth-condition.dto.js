"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateToothConditionDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_tooth_condition_dto_js_1 = require("./create-tooth-condition.dto.js");
class UpdateToothConditionDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_tooth_condition_dto_js_1.CreateToothConditionDto, ['branch_id', 'patient_id', 'tooth_id', 'diagnosed_by'])) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateToothConditionDto = UpdateToothConditionDto;
//# sourceMappingURL=update-tooth-condition.dto.js.map