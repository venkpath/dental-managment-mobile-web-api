"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('razorpay', () => ({
    keyId: process.env['RAZORPAY_KEY_ID'] || '',
    keySecret: process.env['RAZORPAY_KEY_SECRET'] || '',
    webhookSecret: process.env['RAZORPAY_WEBHOOK_SECRET'] || '',
}));
//# sourceMappingURL=razorpay.config.js.map