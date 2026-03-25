"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentSuperAdmin = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentSuperAdmin = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.superAdmin;
});
//# sourceMappingURL=current-super-admin.decorator.js.map