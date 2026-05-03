"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchScopeInterceptor = void 0;
const common_1 = require("@nestjs/common");
const create_user_dto_js_1 = require("../../modules/user/dto/create-user.dto.js");
let BranchScopeInterceptor = class BranchScopeInterceptor {
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (user &&
            user.role !== create_user_dto_js_1.UserRole.SUPER_ADMIN &&
            user.role === create_user_dto_js_1.UserRole.ADMIN &&
            user.branchId) {
            req.query = { ...req.query, branch_id: user.branchId };
        }
        return next.handle();
    }
};
exports.BranchScopeInterceptor = BranchScopeInterceptor;
exports.BranchScopeInterceptor = BranchScopeInterceptor = __decorate([
    (0, common_1.Injectable)()
], BranchScopeInterceptor);
//# sourceMappingURL=branch-scope.interceptor.js.map