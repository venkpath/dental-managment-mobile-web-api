"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentClinic = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentClinic = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.clinicId;
});
//# sourceMappingURL=current-clinic.decorator.js.map