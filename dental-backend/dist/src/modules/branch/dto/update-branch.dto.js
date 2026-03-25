"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBranchDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_branch_dto_js_1 = require("./create-branch.dto.js");
class UpdateBranchDto extends (0, swagger_1.PartialType)(create_branch_dto_js_1.CreateBranchDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateBranchDto = UpdateBranchDto;
//# sourceMappingURL=update-branch.dto.js.map