"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvVars = validateEnvVars;
const common_1 = require("@nestjs/common");
const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
];
const RECOMMENDED_ENV_VARS = [
    'REDIS_HOST',
    'CORS_ORIGIN',
    'SMTP_HOST',
];
function validateEnvVars() {
    const logger = new common_1.Logger('EnvValidation');
    const missing = [];
    for (const envVar of REQUIRED_ENV_VARS) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }
    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    for (const envVar of RECOMMENDED_ENV_VARS) {
        if (!process.env[envVar]) {
            logger.warn(`Recommended environment variable not set: ${envVar}`);
        }
    }
    if (process.env['JWT_SECRET'] === 'change-me-to-a-strong-secret-in-production') {
        logger.warn('JWT_SECRET is using the default value — change it in production!');
    }
}
//# sourceMappingURL=env-validation.js.map