"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePatientDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_patient_dto_js_1 = require("./create-patient.dto.js");
class UpdatePatientDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_patient_dto_js_1.CreatePatientDto, ['branch_id'])) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdatePatientDto = UpdatePatientDto;
//# sourceMappingURL=update-patient.dto.js.map