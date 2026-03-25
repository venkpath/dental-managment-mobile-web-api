"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireFeature = exports.REQUIRE_FEATURE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRE_FEATURE_KEY = 'requireFeature';
const RequireFeature = (featureKey) => (0, common_1.SetMetadata)(exports.REQUIRE_FEATURE_KEY, featureKey);
exports.RequireFeature = RequireFeature;
//# sourceMappingURL=require-feature.decorator.js.map