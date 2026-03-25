"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserDto = exports.UserStatus = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const create_user_dto_js_1 = require("./create-user.dto.js");
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
class UpdateUserDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_user_dto_js_1.CreateUserDto, ['password'])) {
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: false, enum: require("./update-user.dto").UserStatus } };
    }
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ enum: UserStatus, example: UserStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserStatus),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "status", void 0);
//# sourceMappingURL=update-user.dto.js.map