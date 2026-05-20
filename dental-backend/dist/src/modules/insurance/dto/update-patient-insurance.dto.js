"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePatientInsuranceDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_patient_insurance_dto_js_1 = require("./create-patient-insurance.dto.js");
class UpdatePatientInsuranceDto extends (0, swagger_1.PartialType)(create_patient_insurance_dto_js_1.CreatePatientInsuranceDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdatePatientInsuranceDto = UpdatePatientInsuranceDto;
//# sourceMappingURL=update-patient-insurance.dto.js.map