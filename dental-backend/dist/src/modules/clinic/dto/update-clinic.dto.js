"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateClinicDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_clinic_dto_js_1 = require("./create-clinic.dto.js");
class UpdateClinicDto extends (0, swagger_1.PartialType)(create_clinic_dto_js_1.CreateClinicDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateClinicDto = UpdateClinicDto;
//# sourceMappingURL=update-clinic.dto.js.map