"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMembershipPlanDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_membership_plan_dto_js_1 = require("./create-membership-plan.dto.js");
class UpdateMembershipPlanDto extends (0, swagger_1.PartialType)(create_membership_plan_dto_js_1.CreateMembershipPlanDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateMembershipPlanDto = UpdateMembershipPlanDto;
//# sourceMappingURL=update-membership-plan.dto.js.map