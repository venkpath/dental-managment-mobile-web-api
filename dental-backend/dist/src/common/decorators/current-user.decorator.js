"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
        return undefined;
    }
    return {
        ...request.user,
        sub: request.user.userId,
        clinic_id: request.user.clinicId,
        branch_id: request.user.branchId,
    };
});
//# sourceMappingURL=current-user.decorator.js.map