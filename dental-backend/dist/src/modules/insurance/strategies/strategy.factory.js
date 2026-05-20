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
exports.InsuranceStrategyFactory = void 0;
const common_1 = require("@nestjs/common");
const india_strategy_js_1 = require("./india.strategy.js");
let InsuranceStrategyFactory = class InsuranceStrategyFactory {
    india;
    constructor(india) {
        this.india = india;
    }
    get(country) {
        switch ((country || '').toUpperCase()) {
            case 'IN':
                return this.india;
            default:
                throw new common_1.NotImplementedException(`Insurance support for country "${country}" is not yet enabled. India (IN) is currently supported.`);
        }
    }
};
exports.InsuranceStrategyFactory = InsuranceStrategyFactory;
exports.InsuranceStrategyFactory = InsuranceStrategyFactory = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [india_strategy_js_1.IndiaInsuranceStrategy])
], InsuranceStrategyFactory);
//# sourceMappingURL=strategy.factory.js.map