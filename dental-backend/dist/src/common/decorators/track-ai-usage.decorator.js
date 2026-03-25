"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackAiUsage = exports.TRACK_AI_USAGE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.TRACK_AI_USAGE_KEY = 'trackAiUsage';
const TrackAiUsage = () => (0, common_1.SetMetadata)(exports.TRACK_AI_USAGE_KEY, true);
exports.TrackAiUsage = TrackAiUsage;
//# sourceMappingURL=track-ai-usage.decorator.js.map