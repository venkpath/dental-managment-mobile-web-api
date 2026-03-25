"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireClinicGuard = void 0;
const common_1 = require("@nestjs/common");
let RequireClinicGuard = class RequireClinicGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        if (!request.clinicId) {
            throw new common_1.BadRequestException('Missing or invalid x-clinic-id header. A valid clinic UUID is required.');
        }
        if (request.user && request.user.clinicId !== request.clinicId) {
            throw new common_1.ForbiddenException('Clinic context mismatch: x-clinic-id header does not match your authenticated clinic.');
        }
        return true;
    }
};
exports.RequireClinicGuard = RequireClinicGuard;
exports.RequireClinicGuard = RequireClinicGuard = __decorate([
    (0, common_1.Injectable)()
], RequireClinicGuard);
//# sourceMappingURL=require-clinic.guard.js.map