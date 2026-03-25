"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTemplateDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_template_dto_js_1 = require("./create-template.dto.js");
class UpdateTemplateDto extends (0, swagger_1.PartialType)(create_template_dto_js_1.CreateTemplateDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateTemplateDto = UpdateTemplateDto;
//# sourceMappingURL=update-template.dto.js.map