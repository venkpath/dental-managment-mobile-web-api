"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('throttle', () => ({
    defaultLimit: parseInt(process.env['THROTTLE_DEFAULT_LIMIT'] || '10', 10),
    defaultTtl: parseInt(process.env['THROTTLE_DEFAULT_TTL_MS'] || '60000', 10),
    strictLimit: parseInt(process.env['THROTTLE_STRICT_LIMIT'] || '15', 10),
    strictTtl: parseInt(process.env['THROTTLE_STRICT_TTL_MS'] || '60000', 10),
    errorMessage: process.env['THROTTLE_ERROR_MESSAGE'] ||
        'Too many requests. Please wait a moment and try again.',
}));
//# sourceMappingURL=throttle.config.js.map